import { Application, Graphics, Text } from './pixi.mjs';
import "./plotly.js";

let colors = {
    rr: "#E69F00",
    wrr: "#56B4E9",
    lc: "#009E73",
    pewma: "#D55E00",
}

var _globalId = 0;
function nextId() {
    return _globalId++;
}

function randRange({ min, max }) {
    if (min == max) {
        return min;
    }
    return Math.random() * (max - min) + min;
}

function percentInRange(value, { min, max }) {
    if (min === max) {
        return 1;
    }
    return (value - min) / (max - min);
}

function average(array) {
    return array.reduce((a, b) => a + b) / array.length;
}

function getAlgorithm(name) {
    switch (name) {
        case 'round-robin':
            return new RoundRobin();
        case 'least-connections':
            return new LeastConnections();
        case 'weighted-random':
            return new WeightedRandom();
        case 'random':
            return new RandomAlgorithm();
        case 'weighted-round-robin':
            return new WeightedRoundRobin();
        case 'dynamic-weighted-round-robin':
            return new DynamicWeightedRoundRobin();
        case 'peak-exponentially-weighted-moving-average':
            return new PeakExponentiallyWeightedMovingAverage();
    }
}

class PercentileCalculator {
    constructor() {
        this.dataPoints = [];
    }

    addDataPoint(value) {
        this.dataPoints.push(value);
    }

    getPercentile(percentile) {
        if (percentile <= 0 || percentile >= 100) {
            throw new Error('Percentile must be between 0 and 100');
        }

        const sortedDataPoints = this.dataPoints.slice().sort((a, b) => a - b);
        const index = (percentile / 100) * (sortedDataPoints.length - 1);
        const floor = Math.floor(index);
        const ceil = Math.ceil(index);

        if (floor === ceil) {
            return sortedDataPoints[floor];
        }

        const lower = sortedDataPoints[floor] * (ceil - index);
        const upper = sortedDataPoints[ceil] * (index - floor);
        return lower + upper;
    }
}

class PEWMA {
    constructor(alpha) {
        this.alpha = alpha;
        this.maxHistory = 100;
        this.ewmaPeaks = [];
    }

    update(value) {
        const prevPeak = this.ewmaPeaks[this.ewmaPeaks.length - 1] || 1000;
        const alpha = this.alpha;
        const beta = alpha / 4;

        const ewmaPeak = alpha * value + (1 - alpha) * prevPeak;
        this.ewmaPeaks.push(ewmaPeak);
        if (this.ewmaPeaks.length > this.maxHistory) {
            this.ewmaPeaks.shift();
        }

        if (value > prevPeak) {
            const peakRatio = ewmaPeak / prevPeak;
            const weightDelta = beta * peakRatio;

            for (let i = 0; i < this.ewmaPeaks.length - 1; i++) {
                this.ewmaPeaks[i] *= 1 - weightDelta;
            }

            this.ewmaPeaks[this.ewmaPeaks.length - 1] *= 1 + weightDelta;
        }
    }

    getPeak() {
        return this.ewmaPeaks[this.ewmaPeaks.length - 1];
    }
}

class Simulation extends Application {
    constructor({
        element,
        rps = 5,
        rpsVariance = 0,
        numServers = 2,
        queueMaxLength = 10,
        serverSize = 50,
        serverPower = { min: 1, max: 1 },
        serverPowerMax = 10,
        requestSize = 10,
        requestCost = { min: 50, max: 50 },
        requestCostMax = 1000,
        algorithm = "round-robin",
        showRpsSlider = false,
        visible = true,
        showRpsVarianceSlider = false,
        showRequestVarianceSlider = false,
        showServerPowerSlider = false,
        showNumServersSlider = false,
        showAlgorithmSelector = false,
    }) {
        super({
            backgroundAlpha: 0,
            resizeTo: element,
            antialias: visible,
            autoDensity: visible,
            autoStart: false,
            resolution: visible ? 2 : 1,
        });
        this.renderer.plugins.interaction.autoPreventDefault = false;
        this.renderer.view.style.touchAction = 'auto';

        if (!visible) {
            element.style.display = 'none';
        }

        element.innerHTML = '';

        let f = (e) => {
            let bottomOfScreen = window.scrollY + window.innerHeight + 50;
            let topOfScreen = window.scrollY - 50;
            let bottomOfElement = element.offsetTop + element.offsetHeight;
            let topOfElement = element.offsetTop;

            let isVisible = bottomOfScreen > topOfElement &&
                topOfScreen < bottomOfElement;

            if (!this.ticker.started && isVisible) {
                this.start();
                return;
            }

            if (visible) {
                if (this.ticker.started && !isVisible) {
                    this.stop();
                    return;
                }
            }
        }

        window.addEventListener("scroll", f);
        window.addEventListener("focus", f);
        window.addEventListener("blur", f);
        f();

        let container = document.createElement('div');
        element.appendChild(container);

        let uiContainer = document.createElement('div');
        uiContainer.style.position = 'absolute';

        if (showAlgorithmSelector) {
            let algorithmSelectorContainer = document.createElement('div');
            let algorithmSelectorLabel = document.createElement('label');
            algorithmSelectorLabel.innerText = 'Algorithm';
            let algorithmSelector = document.createElement('select');
            algorithmSelector.innerHTML = `
                <option value="round-robin">Round Robin</option>
                <option value="weighted-random">Weighted Random</option>
                <option value="dynamic-weighted-round-robin">Weighted Round Robin</option>
                <option value="least-connections">Least Connections</option>
                <option value="peak-exponentially-weighted-moving-average">Peak EWMA</option>
                <option value="random">Random</option>
            `;
            algorithmSelector.value = algorithm;
            algorithmSelectorContainer.appendChild(algorithmSelector);
            algorithmSelectorContainer.appendChild(algorithmSelectorLabel);
            algorithmSelector.addEventListener('change', (e) => {
                this.loadBalancer.algorithm = getAlgorithm(e.target.value);
            });
            uiContainer.appendChild(algorithmSelectorContainer);
        }

        if (showRpsSlider) {
            let rpsSliderContainer = document.createElement('div');
            let rpsSliderLabel = document.createElement('label');
            rpsSliderLabel.innerText = 'RPS';
            let rpsSlider = document.createElement('input');
            rpsSlider.type = 'range';
            rpsSlider.min = 0;
            rpsSlider.max = 40;
            rpsSlider.value = Math.min(rps, parseInt(rpsSlider.max));
            rps = parseInt(rpsSlider.value);
            rpsSliderContainer.appendChild(rpsSlider);
            rpsSliderContainer.appendChild(rpsSliderLabel);
            rpsSlider.addEventListener('input', (e) => {
                this.rps = parseInt(e.target.value);
            });
            uiContainer.appendChild(rpsSliderContainer);
        }

        if (showRpsVarianceSlider) {
            let rpsVarianceSliderContainer = document.createElement('div');
            let rpsVarianceSliderLabel = document.createElement('label');
            rpsVarianceSliderLabel.innerText = 'RPS Variance';
            let rpsVarianceSlider = document.createElement('input');
            rpsVarianceSlider.type = 'range';
            rpsVarianceSlider.min = 0;
            rpsVarianceSlider.max = 100;
            rpsVarianceSlider.value = Math.min(rpsVariance * 100, parseInt(rpsVarianceSlider.max));
            rpsVariance = parseInt(rpsVarianceSlider.value) / 100;
            rpsVarianceSliderContainer.appendChild(rpsVarianceSlider);
            rpsVarianceSliderContainer.appendChild(rpsVarianceSliderLabel);
            rpsVarianceSlider.addEventListener('input', (e) => {
                this.rpsVariance = parseInt(e.target.value) / 100;
            });
            uiContainer.appendChild(rpsVarianceSliderContainer);
        }

        if (showRequestVarianceSlider) {
            let requestVarianceSliderContainer = document.createElement('div');
            let requestVarianceSliderLabel = document.createElement('label');
            requestVarianceSliderLabel.innerText = 'Request Cost Variance';
            let requestVarianceSlider = document.createElement('input');
            requestVarianceSlider.type = 'range';
            requestVarianceSlider.min = requestCost.min;
            requestVarianceSlider.max = requestCostMax;
            requestVarianceSlider.value = requestCost.max;
            requestVarianceSliderContainer.appendChild(requestVarianceSlider);
            requestVarianceSliderContainer.appendChild(requestVarianceSliderLabel);
            requestVarianceSlider.addEventListener('input', (e) => {
                this.requestCost = {
                    min: parseInt(e.target.min),
                    max: parseInt(e.target.value),
                };
            });
            uiContainer.appendChild(requestVarianceSliderContainer);
        }

        if (showServerPowerSlider) {
            let serverPowerSliderContainer = document.createElement('div');
            let serverPowerSliderLabel = document.createElement('label');
            serverPowerSliderLabel.innerText = 'Server Power Variance';
            let serverPowerSlider = document.createElement('input');
            serverPowerSlider.type = 'range';
            serverPowerSlider.min = serverPower.min;
            serverPowerSlider.max = serverPowerMax;
            serverPowerSlider.value = serverPower.min;
            serverPowerSliderContainer.appendChild(serverPowerSlider);
            serverPowerSliderContainer.appendChild(serverPowerSliderLabel);
            serverPowerSlider.addEventListener('input', (e) => {
                this.serverPower = {
                    min: parseInt(e.target.min),
                    max: parseInt(e.target.value)
                };
                this.serverPowerMax = parseInt(e.target.max);
            });
            uiContainer.appendChild(serverPowerSliderContainer);
        }

        if (showNumServersSlider) {
            let numServersSliderContainer = document.createElement('div');
            let numServersSliderLabel = document.createElement('label');
            numServersSliderLabel.innerText = 'Num Servers';
            let numServersSlider = document.createElement('input');
            numServersSlider.type = 'range';
            numServersSlider.min = 1;
            numServersSlider.max = Math.floor(this.screen.width / serverSize);
            numServersSlider.value = Math.min(parseInt(numServersSlider.max), numServers);
            numServers = parseInt(numServersSlider.value);
            numServersSliderContainer.appendChild(numServersSlider);
            numServersSliderContainer.appendChild(numServersSliderLabel);
            numServersSlider.addEventListener('input', (e) => {
                this.numServers = parseInt(e.target.value);
            });
            uiContainer.appendChild(numServersSliderContainer);
        }

        container.appendChild(uiContainer);
        container.appendChild(this.view);

        this.agents = [];
        this.parent = element;
        this.serverSize = serverSize;
        this.serverY = uiContainer.clientHeight + (requestSize * 2 * queueMaxLength) + this.screen.height / 20;
        this.queueMaxLength = queueMaxLength;

        this.loadBalancer = new LoadBalancer(this, {
            x: this.screen.width / 2 - this.serverSize / 2,
            y: this.screen.height - serverSize - this.screen.height / 20,
            rps: rps,
            rpsVariance: rpsVariance,
            requestCost: requestCost,
            size: serverSize,
            algorithm: getAlgorithm(algorithm),
        });

        for (let i = 0; i < numServers; i++) {
            var power = serverPower;
            if (Array.isArray(serverPower)) {
                power = { min: serverPower[i], max: serverPower[i] };
            }

            const server = new Server(
                this,
                {
                    x: 0,
                    y: this.serverY,
                    power: power,
                    powerMax: serverPowerMax,
                    size: serverSize,
                    queueMaxLength: queueMaxLength,
                    requestSize: requestSize,
                }
            );
            this.loadBalancer.addServer(server);
        }

        this.positionServers();
        this.ticker.add((delta) => this.update(delta));
    }

    onRequestDestroyed(callback) {
        this.loadBalancer.onRequestDestroyed(callback);
    }

    positionServers() {
        let numServers = this.loadBalancer.servers.length;
        let spacing = (this.screen.width - this.serverSize * numServers) / (numServers + 1);

        for (let i = 0; i < numServers; i++) {
            const server = this.loadBalancer.servers[i];
            server.setX(spacing + (this.serverSize + spacing) * i);
        }
    }

    set numServers(numServers) {
        let currentNumServers = this.loadBalancer.servers.length;
        if (numServers > currentNumServers) {
            for (let i = currentNumServers; i < numServers; i++) {
                const server = new Server(
                    this,
                    {
                        x: 0,
                        y: this.serverY,
                        power: this.loadBalancer.servers[0].powerRange,
                        powerMax: this.loadBalancer.servers[0].powerMax,
                        size: this.serverSize,
                        queueMaxLength: this.queueMaxLength,
                        requestSize: this.requestSize,
                    }
                );
                console.log(server);
                this.loadBalancer.addServer(server);
            }
        } else if (numServers < currentNumServers) {
            for (let i = currentNumServers - 1; i >= numServers; i--) {
                this.loadBalancer.servers[i].destroy();
                this.loadBalancer.servers.splice(i, 1);
            }
        }

        this.positionServers();
    }

    set requestCost(requestCost) {
        this.loadBalancer.requestCost = requestCost;
    }

    set serverPower(serverPower) {
        for (let server of this.loadBalancer.servers) {
            server.power = serverPower;
        }
    }

    get rps() {
        return this.loadBalancer.rps;
    }

    set rps(rps) {
        this.loadBalancer.rps = rps;
    }

    get rpsVariance() {
        return this.loadBalancer.rpsVariance;
    }

    set rpsVariance(rpsVariance) {
        this.loadBalancer.rpsVariance = rpsVariance;
    }

    add(agent) {
        this.stage.addChild(agent);
        this.agents.push(agent);
    }

    update(delta) {
        if (this.debug) {
            console.log(`[simulator] checking for agents to remove`);
        }
        var numAgentsRemoved = 0;
        for (let i = this.agents.length - 1; i >= 0; i--) {
            if (this.debug) {
                console.log(`[simulator] checking index ${i} (${this.agents[i].id})`);
            }
            if (this.agents[i].destroyed) {
                var removed = this.agents.splice(i, 1);
                numAgentsRemoved++;
                if (this.debug) {
                    console.log(`[simulator] removed ${removed[0].id}`);
                }
            }
        }
        if (this.debug) {
            console.log(`[simulator] removed ${numAgentsRemoved} agents`);
        }

        if (this.debug) {
            console.log(`[simulator] update(${delta})`);
        }
        for (let agents of this.agents) {
            agents.update(delta);
        }
        if (this.debug) {
            console.log(`[simulator] done updating`);
        }
    }
}

class Agent extends Graphics {
    constructor(simulation) {
        super();
        this.simulation = simulation;
        this.id = nextId();
        this.debug = false;
        this.simulation.add(this);
        this.onDestroyHooks = [];
    }

    update(delta) {
        if (this.debug) {
            console.log(`[${this.id}] update(${delta})`);
        }
    }

    destroy() {
        if (this.debug) {
            console.log(`[${this.id}] destroy()`);
        }
        for (let f of this.onDestroyHooks) {
            f();
        }
        super.destroy();
    }

    onDestroy(f) {
        this.onDestroyHooks.push(f);
    }
}

class RequestQueue extends Agent {
    constructor(simulation, { x, y, length, requestSize = 10, color = "#dddddd" }) {
        super(simulation);
        this.x = x;
        this.y = y;
        this.length = length;
        this.requests = []
        this.color = color;

        this.beginFill("#FFFFFF");
        this.lineStyle(1, this.color, 1, 0)
        this.drawRect(
            -requestSize - 1,
            -requestSize * 2 * length + 8,
            requestSize * 2 + 2,
            requestSize * length * 2 - 6,
        );
        this.endFill();
    }

    setX(x) {
        this.x = x;
        for (let request of this.requests) {
            request.x = x;
        }
    }

    enqueue(request) {
        if (this.requests.length >= this.length) {
            return false;
        }

        request.queued = Date.now();
        if (this.requests.length === 0) {
            request.centerX = this.x;
            request.centerY = this.y;
            this.requests.push(request);
            return true;
        }

        let tail = this.requests[this.requests.length - 1];
        this.requests.push(request);
        request.centerX = tail.centerX;
        request.y = tail.y - tail.size * 2;

        return true;
    }

    dequeue() {
        let request = this.requests.shift();
        for (let r of this.requests) {
            r.y += r.size * 2;
        }
        return request
    }

    destroy() {
        super.destroy();
        for (let request of this.requests) {
            request.destroy();
        }
    }
}



class Server extends Agent {
    constructor(simulation, {
        x,
        y,
        size = 40,
        power = { min: 1, max: 10 },
        powerMax = 10,
        queueMaxLength = 10,
        requestSize = 10,
    }) {
        super(simulation);
        this.x = x;
        this.y = y;
        this._width = size;
        this._height = size;
        this.power = power;
        this.powerMax = powerMax;
        this.currentRequest = null;

        this.text = new Text("", { fill: 0x000000 });
        this.text.y = this._height + 5;
        this.addChild(this.text);

        this.color = 0xFFFFFF;
        this.draw();

        this.queue = new RequestQueue(this.simulation, {
            x: this.centerX,
            y: this.y - 2,
            length: queueMaxLength,
            requestSize: requestSize,
        });
        simulation.add(this.queue);
    }

    setX(x) {
        this.x = x;
        this.queue.setX(this.centerX);
        if (this.currentRequest) {
            this.currentRequest.centerX = this.centerX;
        }
    }

    draw() {
        this.beginFill(this.color);
        this.drawRoundedRect(0, 0, this._width, this._height, 10);
        this.endFill();
    }

    set power(power) {
        this._power = randRange(power);
        this._powerRange = power;
        this._initialPower = power;
    }

    get power() {
        return this._power;
    }

    get powerRange() {
        return this._powerRange;
    }

    get queueLength() {
        return this.queue.requests.length;
    }

    get centerX() {
        return this.x + (this._width / 2);
    }

    get centerY() {
        return this.y + (this._height / 2);
    }

    setText(text) {
        if (!typeof text === "string") {
            text = text.toString();
        }
        this.text.text = text;
        this.text.x = this._width / 2 - this.text.width / 2;
    }

    addRequest(request) {
        if (!this.currentRequest) {
            this.currentRequest = request;
            return;
        }

        let queued = this.queue.enqueue(request);
        if (!queued) {
            new DroppedRequest(this.simulation, {
                x: request.x, y: request.y, size: request.size
            });
            request.dropped = true;
            request.destroy();
        }
    }

    set currentRequest(request) {
        this._currentRequest = request;
        if (request) {
            request.centerX = this.centerX;
            request.centerY = this.centerY;
            request.workStarted = Date.now();
        }
    }

    get currentRequest() {
        return this._currentRequest;
    }

    update(delta) {
        super.update(delta);

        if (this.destroyed) {
            return;
        }

        let percent = percentInRange(this._power, {
            min: 1,
            max: this.powerMax,
        });

        this.color = blendColors(0xDDDDDD, 0x555555, percent);
        this.tint = this.color;

        let power = this._power;

        while (true) {
            if (!this.currentRequest) {
                this.currentRequest = this.queue.dequeue();
            }

            if (!this.currentRequest) {
                break;
            }

            this.currentRequest.cost -= power * delta;
            this.currentRequest.timeSpentProcessingMS += this.simulation.ticker.elapsedMS;
            if (this.currentRequest.cost <= 0) {
                power = -this.currentRequest.cost;
                this.currentRequest.served = Date.now();
                this.currentRequest.destroy();
                this.currentRequest = null;
            } else {
                break;
            }
        }
    }

    destroy() {
        super.destroy();
        this.queue.destroy();
    }
}

class LoadBalancingAlgorithm {
    chooseServer(request, servers) { }
    onRequestDestroyed(request) { }
    init(loadBalancer) { }
}

class RoundRobin extends LoadBalancingAlgorithm {
    constructor() {
        super();
        this.currentServer = 0;
    }

    chooseServer(request, servers) {
        if (this.currentServer >= servers.length) {
            this.currentServer = 0;
        }

        const server = servers[this.currentServer];
        this.currentServer += 1;
        return server;
    }
}

class WeightedRandom extends LoadBalancingAlgorithm {
    chooseServer(request, servers) {
        let totalPower = 0;
        for (let server of servers) {
            totalPower += server.power;
        }

        let random = Math.random() * totalPower;
        for (let server of servers) {
            random -= server.power;
            if (random <= 0) {
                return server;
            }
        }
    }
}

class WeightedRoundRobin extends LoadBalancingAlgorithm {
    constructor() {
        super();
        this.currentServer = 0;
        this.numRequestsSentToCurrentServer = 0;
    }

    chooseServer(request, servers) {
        let minPower = 999999;
        for (let server of servers) {
            minPower = Math.min(minPower, server.power);
        }

        var server = servers[this.currentServer];
        let requestsToSend = Math.ceil(server.power / minPower);

        if (this.numRequestsSentToCurrentServer >= requestsToSend) {
            this.currentServer += 1;
            if (this.currentServer >= servers.length) {
                this.currentServer = 0;
            }
            this.numRequestsSentToCurrentServer = 0;
            server = servers[this.currentServer];
        }

        this.numRequestsSentToCurrentServer += 1;
        return server;
    }
}

class DynamicWeightedRoundRobin extends LoadBalancingAlgorithm {
    constructor() {
        super();
        this.currentServer = 0;
        this.numRequestsSentToCurrentServer = 0;
        this.latencies = {};
        this.averageLatencies = {};
        this.range = 3;
    }

    chooseServer(request, servers) {
        let minLatency = 999999;
        let maxLatency = 0;
        for (let server of servers) {
            minLatency = Math.min(minLatency, this.averageLatencies[server.id] || 99999999);
            maxLatency = Math.max(maxLatency, this.averageLatencies[server.id] || 0);
        }

        var server = servers[this.currentServer];

        var requestsToSend;
        if (this.latencies[server.id] === undefined) {
            requestsToSend = 1;
        } else {
            requestsToSend = this.range - Math.ceil(((this.averageLatencies[server.id] - minLatency) / maxLatency) * this.range);
        }

        if (this.numRequestsSentToCurrentServer >= requestsToSend) {
            this.currentServer += 1;
            if (this.currentServer >= servers.length) {
                this.currentServer = 0;
            }
            this.numRequestsSentToCurrentServer = 0;
            server = servers[this.currentServer];
        }

        this.numRequestsSentToCurrentServer += 1;
        return server;
    }

    onRequestDestroyed(request) {
        if (request.dropped) {
            return;
        }
        if (this.latencies[request.destination.id] === undefined) {
            this.latencies[request.destination.id] = [];
        }
        this.latencies[request.destination.id].push(request.timeSpentProcessingMS);
        if (this.latencies[request.destination.id].length > 3) {
            this.latencies[request.destination.id].shift();
        }
        this.averageLatencies[request.destination.id] = average(this.latencies[request.destination.id]);

        request.destination.setText(`${(this.averageLatencies[request.destination.id] / 1000).toFixed(1)}s`);
    }
}

class PeakExponentiallyWeightedMovingAverage extends LoadBalancingAlgorithm {
    constructor() {
        super();
        this.pewma = {};
        this.connections = {};
        this.smoothing = 0.2;
    }

    init(loadBalancer) {
        this.connections = {};
        for (let agent of loadBalancer.simulation.agents) {
            if (agent instanceof Request) {
                if (this.connections[agent.destination.id] === undefined) {
                    this.connections[agent.destination.id] = 0;
                }
                this.connections[agent.destination.id] += 1;
            }
        }
    }

    chooseServer(request, servers) {
        for (let server of servers) {
            if (this.connections[server.id] === undefined) {
                this.connections[server.id] = 0;
            }
            if (this.pewma[server.id] === undefined) {
                this.pewma[server.id] = new PEWMA(this.smoothing);
            }
        }

        let chosen = servers[0];
        for (let i = 1; i < servers.length; i++) {
            let server = servers[i];
            let lowest = (this.connections[chosen.id] + 1) * (this.pewma[chosen.id].getPeak() || 1000);
            let current = (this.connections[server.id] + 1) * (this.pewma[server.id].getPeak() || 1000);
            if (current < lowest) {
                chosen = server;
            }
        }

        this.connections[chosen.id] += 1;
        return chosen;
    }

    onRequestDestroyed(request) {
        this.connections[request.destination.id] -= 1;
        if (this.pewma[request.destination.id] === undefined) {
            this.pewma[request.destination.id] = new PEWMA(this.smoothing);
        }
        if (request.dropped) {
            this.pewma[request.destination.id].update(5000);
            return;
        }
        this.pewma[request.destination.id].update(request.age);
        //request.destination.setText(`${(this.pewma[request.destination.id].getPeak() / 1000).toFixed(1)}s`);
    }
}


class LeastConnections extends LoadBalancingAlgorithm {
    constructor() {
        super();
        this.connections = {};
    }

    init(loadBalancer) {
        this.connections = {};
        for (let agent of loadBalancer.simulation.agents) {
            if (agent instanceof Request) {
                if (this.connections[agent.destination.id] === undefined) {
                    this.connections[agent.destination.id] = 0;
                }
                this.connections[agent.destination.id] += 1;
            }
        }
    }


    chooseServer(request, servers) {
        for (let server of servers) {
            if (this.connections[server.id] === undefined) {
                this.connections[server.id] = 0;
            }
        }

        let chosen = [servers[0]];
        for (let i = 1; i < servers.length; i++) {
            let server = servers[i];
            let lowest = this.connections[chosen[0].id];
            let current = this.connections[server.id];
            if (current < lowest) {
                chosen = [server];
            } else if (current === lowest) {
                chosen.push(server);
            }
        }

        let server = chosen[Math.floor(Math.random() * chosen.length)];
        this.connections[server.id] += 1;
        return server;
    }

    onRequestDestroyed(request) {
        this.connections[request.destination.id] -= 1;
    }
}

class RandomAlgorithm extends LoadBalancingAlgorithm {
    chooseServer(request, servers) {
        return servers[Math.floor(Math.random() * servers.length)];
    }
}

class LoadBalancer extends Server {
    constructor(simulation, {
        x,
        y,
        rps,
        rpsVariance,
        algorithm,
        size = 40,
        requestSize = 10,
        requestCost = { min: 10, max: 10 }
    }) {
        super(simulation, { x, y, size });
        this.rps = rps;
        this.msUntilNextRequest = 0;
        this.requestSize = requestSize;
        this.rpsVariance = rpsVariance;
        this.servers = [];
        this.algorithm = algorithm;
        this.requestCost = requestCost;
        this.onRequestDestroyedCallbacks = [];

        this.beginFill(0x000000);
        this.drawRoundedRect(0, 0, this._width, this._height, 10);
        this.endFill();

        this.queue.destroy();
    }

    onRequestDestroyed(callback) {
        this.onRequestDestroyedCallbacks.push(callback);
    }

    set algorithm(algorithm) {
        this._algorithm = algorithm;
        this.algorithm.init(this);
        for (let server of this.servers) {
            server.setText("");
        }
    }

    get algorithm() {
        return this._algorithm;
    }

    update(delta) {
        if (this.rps === 0) {
            return;
        }
        let msPerRequest = 1000 / this.rps;
        let elapsedMS = this.simulation.ticker.elapsedMS;
        this.msUntilNextRequest -= elapsedMS;
        if (this.msUntilNextRequest <= 0) {
            this.msUntilNextRequest = msPerRequest * randRange({ min: 1 - this.rpsVariance, max: 1 + this.rpsVariance });
            this.sendRequest();
        }
    }

    addServer(server) {
        this.servers.push(server);
    }

    sendRequest() {
        if (this.servers.length === 0) {
            return;
        }

        const request = new Request(this.simulation, {
            source: this,
            size: this.requestSize,
            cost: this.requestCost,
        });
        const server = this.algorithm.chooseServer(request, this.servers);
        request.onDestroy(() => {
            this.algorithm.onRequestDestroyed(request);
            for (let callback of this.onRequestDestroyedCallbacks) {
                callback(request);
            }
        });
        request.destination = server;
    }
}

class Request extends Agent {
    constructor(simulation, { source = null, destination = null, cost = { min: 1, max: 1 }, size = 10 }) {
        super(simulation);
        this.size = size;
        this.source = source;
        this.speed = 10;
        this.destination = destination;
        this.arrivedAtDestination = false;
        this.costRange = cost;
        this.cost = randRange(cost);
        this.initialCost = this.cost;
        this.created = Date.now();
        this.queued = null;
        this.workStarted = null;
        this.served = null;
        this.age = 0;
        this.timeSpentProcessingMS = 0;
        this.dropped = false;

        this.draw();
    }

    get color() {
        let green = 0x04BF8A;
        let red = 0xF22233;

        let thresholdMs = 10000;
        return blendColors(green, red, Math.min(1, this.age / thresholdMs));
    }

    draw() {
        if (this.destroyed) {
            return;
        }
        this.clear();
        this.beginFill(0xFFFFFF);
        this.drawCircle(0, 0, this.size * (this.cost / this.initialCost));
        this.endFill();
    }

    set source(source) {
        if (!source) {
            return;
        }
        this.x = source.centerX;
        this.y = source.centerY;
    }

    get centerX() {
        return this.x;
    }

    get centerY() {
        return this.y;
    }

    set centerX(x) {
        this.x = x;
    }

    set centerY(y) {
        this.y = y;
    }

    update(delta) {
        super.update(delta);

        this.age += this.simulation.ticker.elapsedMS;
        this.tint = this.color;

        if (this.destination.destroyed) {
            this.destroy();
            return;
        }

        if (this.destroyed) {
            return;
        }

        let scale = this.cost / this.initialCost;
        this.scale.set(scale, scale);

        if (this.arrivedAtDestination) {
            return;
        }

        if (!this.destination) {
            return;
        }

        const dx = this.destination.centerX - this.centerX;
        const dy = this.destination.centerY - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.speed * delta) {
            this.centerX = this.destination.centerX;
            this.centerY = this.destination.centerY;
            this.destination.addRequest(this);
            this.arrivedAtDestination = true;
            return;
        }

        const rotation = Math.atan2(this.destination.centerY - this.centerY, this.destination.centerX - this.centerX);
        this.x += Math.cos(rotation) * this.speed * delta;
        this.y += Math.sin(rotation) * this.speed * delta;
    }

}

class DroppedRequest extends Agent {
    constructor(simulation, { x, y, size }) {
        super(simulation);
        this.size = size;
        this.x = x;
        this.y = y;
        this.vx = randRange({ min: -1, max: 1 });
        this.vy = randRange({ min: -1, max: 1 });

        this.beginFill(0xff0000);
        this.drawCircle(0, 0, this.size);
        this.endFill();
    }

    update(delta) {
        super.update(delta);
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.5 * delta;

        if (this.x < 0 || this.x > this.simulation.screen.width) {
            this.destroy();
            return;
        }
        if (this.y < 0 || this.y > this.simulation.screen.height) {
            this.destroy();
            return;
        }
    }
}

function blendColors(color1, color2, blend) {
    // convert integer hex values to RGB arrays
    var rgb1 = hexToRgb(color1);
    var rgb2 = hexToRgb(color2);

    // blend the RGB values
    var r = Math.round(rgb1.r * (1 - blend) + rgb2.r * blend);
    var g = Math.round(rgb1.g * (1 - blend) + rgb2.g * blend);
    var b = Math.round(rgb1.b * (1 - blend) + rgb2.b * blend);

    // convert the blended RGB values back to integer hex
    var blendedColor = rgbToHex(r, g, b);

    return blendedColor;
}

function hexToRgb(hex) {
    // convert 24-bit integer hex value to RGB array
    var r = (hex >> 16) & 255;
    var g = (hex >> 8) & 255;
    var b = hex & 255;

    return { r: r, g: g, b: b };
}

function rgbToHex(r, g, b) {
    // convert RGB values to 24-bit integer hex value
    var hexR = r.toString(16).padStart(2, '0');
    var hexG = g.toString(16).padStart(2, '0');
    var hexB = b.toString(16).padStart(2, '0');

    return parseInt(`${hexR}${hexG}${hexB}`, 16);
}

document.addEventListener("DOMContentLoaded", function () {
    new Simulation({
        element: document.getElementById("1"),
        numServers: 1,
        serverPower: { min: 2, max: 2 },
        rps: 1,
        queueMaxLength: 0,
    });

    new Simulation({
        element: document.getElementById("2"),
        numServers: 1,
        serverPower: { min: 2, max: 2 },
        rps: 3,
        queueMaxLength: 0,
    });

    new Simulation({
        element: document.getElementById("3"),
        numServers: 2,
        serverPower: { min: 2, max: 2 },
        rps: 3,
        queueMaxLength: 0,
    });

    new Simulation({
        element: document.getElementById("4"),
        numServers: 5,
        serverPower: { min: 2, max: 2 },
        rps: 5,
        queueMaxLength: 0,
    });

    new Simulation({
        element: document.getElementById("5"),
        numServers: 5,
        serverPower: { min: 2, max: 2 },
        rps: 4,
        requestCost: { min: 30, max: 200 },
        queueMaxLength: 0,
    });

    new Simulation({
        element: document.getElementById("6"),
        numServers: 5,
        serverPower: { min: 2, max: 2 },
        rps: 5,
        requestCost: { min: 30, max: 200 },
        queueMaxLength: 3,
    });

    new Simulation({
        element: document.getElementById("7"),
        numServers: 5,
        serverPower: [1, 3, 5, 6, 8],
        serverPowerMax: 8,
        rps: 5,
        requestCost: { min: 100, max: 300 },
        queueMaxLength: 3,
    });

    new Simulation({
        element: document.getElementById("8"),
        numServers: 5,
        serverPower: [1, 1, 2, 2, 3],
        serverPowerMax: 3,
        rps: 5,
        requestCost: { min: 70, max: 160 },
        queueMaxLength: 3,
        algorithm: "weighted-round-robin",
    });

    new Simulation({
        element: document.getElementById("9"),
        numServers: 5,
        serverPower: [1, 1, 2, 2, 3],
        serverPowerMax: 3,
        rps: 5,
        requestCost: { min: 70, max: 150 },
        queueMaxLength: 3,
        algorithm: "dynamic-weighted-round-robin",
    });

    new Simulation({
        element: document.getElementById("10"),
        numServers: 6,
        serverPower: { min: 1, max: 10 },
        serverPowerMax: 10,
        rps: 8,
        requestCost: { min: 10, max: 300 },
        queueMaxLength: 3,
        algorithm: "dynamic-weighted-round-robin",
    });

    new Simulation({
        element: document.getElementById("11"),
        numServers: 5,
        serverPower: [2, 4, 6, 8, 10],
        serverPowerMax: 10,
        rps: 5,
        requestCost: { min: 100, max: 300 },
        queueMaxLength: 3,
        algorithm: "least-connections",
    });

    new Simulation({
        element: document.getElementById("12"),
        numServers: 6,
        serverPower: { min: 1, max: 10 },
        rps: 8,
        requestCost: { min: 100, max: 300 },
        queueMaxLength: 3,
        algorithm: "least-connections",
    });

    let histogramData = [{
        "name": "Round robin (RR)",
        "x": [524.979, 899.9639999999999, 733.3040000000001, 1849.9260000000002, 958.2949999999998, 908.2970000000003, 941.6290000000001, 616.6419999999998, 874.9649999999997, 1024.959, 708.3049999999998, 933.2959999999998, 691.6390000000001, 916.6300000000001, 916.6300000000001, 833.3000000000002, 858.299, 499.98, 1658.2669999999998, 574.9769999999999, 1199.9519999999998, 949.962, 1049.9579999999996, 816.634, 691.6390000000001, 608.3090000000002, 1958.255, 1124.955, 991.9920000000002, 650.3389999999999, 950.3270000000002, 674.973, 1016.991, 2116.9469999999997, 1024.9589999999998, 708.3049999999994, 1825.2919999999995, 766.6360000000004, 633.308, 1158.2870000000003, 716.6379999999999, 824.9670000000006, 2033.2519999999995, 849.9659999999994, 849.9660000000003, 1274.9489999999996, 1024.9589999999998, 1758.263, 608.3090000000002, 1099.9560000000001, 1016.6260000000002, 774.969, 849.9660000000003, 599.9759999999987, 1749.9299999999994, 941.6289999999999, 683.3060000000005, 858.2990000000009, 1016.6260000000002, 658.3070000000007, 816.634, 558.3109999999997, 2041.585000000001, 758.3029999999999, 691.639000000001, 958.2950000000001, 499.97999999999956, 983.2939999999999, 758.3029999999999, 708.3050000000003, 2433.236000000001, 741.6370000000006, 1008.2929999999997, 2091.5830000000005, 866.6319999999996, 766.6360000000004, 1341.6129999999994, 516.6459999999988, 916.6299999999992, 824.9670000000006, 1308.280999999999, 1024.958999999999, 2499.8999999999996, 649.9740000000002, 549.9779999999992, 716.6380000000008, 1174.9529999999995, 716.6380000000008, 599.9760000000006, 791.6350000000002, 2783.2219999999998, 866.6319999999996, 733.3040000000001, 858.2989999999991, 799.9680000000008, 683.3059999999987, 566.6440000000002, 616.6419999999998, 2808.2209999999995, 516.6460000000006, 974.9610000000011, 449.98199999999997, 2754.5840000000007, 1112.9830000000002, 829.6610000000001, 796.3289999999997, 2546.259, 724.9710000000014, 608.3089999999993, 683.3060000000005, 1308.280999999999, 941.628999999999, 533.3120000000017, 2587.923999999999, 816.634, 583.3099999999977, 1133.2880000000005, 2354.6000000000004, 1033.2920000000013, 641.6409999999996, 983.293999999998, 849.9660000000003, 591.643, 2174.9130000000005, 824.9670000000006, 649.9739999999983, 1066.6239999999998, 833.2999999999993, 849.9660000000003, 2241.5769999999975, 641.6409999999996, 1049.9579999999987, 1099.956000000002, 2083.25, 899.9639999999999, 891.6310000000012, 899.9639999999999, 649.974000000002, 2008.252999999997, 999.9599999999991, 1158.2870000000003, 816.6339999999982, 891.6310000000012, 874.9650000000001, 824.9670000000006, 591.643, 883.2979999999989, 708.3050000000003, 2258.243000000002, 491.64700000000084, 866.6320000000014, 2016.5859999999993, 891.6310000000012, 1299.9479999999967, 1016.6260000000002, 858.2990000000027, 949.9619999999995, 841.632999999998, 874.9650000000001, 2324.9069999999992, 1049.9579999999987, 583.3100000000013, 733.3040000000001, 708.3050000000003, 1233.2839999999997, 866.6319999999978, 524.9789999999994, 2683.2259999999987, 708.3049999999967, 1008.2929999999978, 1166.6200000000026, 1041.625, 2533.2320000000036, 699.9720000000016, 758.3029999999999, 1108.2890000000007, 791.635000000002, 916.630000000001, 733.3040000000001, 599.9759999999987, 2566.5639999999985, 741.6370000000024, 941.6290000000008, 716.637999999999, 1058.2909999999974, 2574.897000000001, 558.3109999999979, 841.632999999998, 708.3050000000003, 824.9669999999969, 2399.9039999999986, 716.637999999999, 941.6290000000008, 866.6320000000014, 808.3009999999995, 708.3050000000003, 2516.5660000000025, 883.2980000000025, 749.9700000000012, 708.3050000000003, 574.9770000000026, 2216.5780000000013, 758.3029999999999, 808.3010000000031, 683.3060000000005, 1891.5910000000003, 624.9750000000022, 958.2949999999983, 641.6409999999996, 1041.625, 891.6310000000012, 1858.2589999999982, 733.3040000000001, 874.9650000000001, 741.6369999999988, 1474.940999999999, 549.9779999999992, 758.3029999999999, 1208.2849999999999, 1249.9500000000007, 958.2949999999983, 974.961000000003, 933.2960000000021, 749.9700000000012, 1016.6260000000002, 799.9680000000008, 691.6389999999992, 941.6290000000008, 449.98199999999997, 1141.6209999999992, 1016.6260000000002, 924.9630000000034, 933.2959999999985, 1674.933000000001, 741.6370000000024, 699.9720000000016, 566.6440000000039, 841.6330000000016, 708.3049999999967, 1399.9439999999995, 974.9609999999957, 583.3099999999977, 749.9700000000012, 1166.6200000000026, 941.6290000000008, 916.6300000000047, 924.9629999999961, 808.3009999999995, 691.6390000000029, 1258.283000000003, 1008.2929999999978, 449.9820000000036, 1037.8430000000008, 721.1889999999985, 1012.8439999999973, 979.5120000000024, 696.1900000000023, 896.1820000000007, 658.3070000000007, 699.9720000000016, 1099.9559999999983, 749.9700000000012, 508.31299999999464, 949.9619999999995, 1679.4839999999967, 641.6410000000033, 1049.9579999999987, 749.9700000000012, 924.9630000000034, 708.3050000000003, 516.6460000000006, 766.6359999999986, 2024.9190000000017, 824.9669999999969, 766.6359999999986, 574.976999999999, 858.2989999999991, 1066.6239999999962, 749.9700000000012, 2174.9130000000005, 933.2959999999948, 499.9800000000032, 558.3110000000015, 849.9660000000003, 1958.2549999999974, 1216.6180000000022, 949.9619999999995, 691.6390000000029, 608.3090000000011, 1058.2910000000047, 933.2960000000021, 2049.917999999998, 783.301999999996, 499.9800000000032, 574.976999999999, 1024.9590000000026, 2074.9170000000013, 966.627999999997, 874.9650000000038, 599.9759999999951, 824.9669999999969, 1016.6259999999966, 1174.9530000000013, 766.6360000000059, 2299.908000000003, 616.6419999999998, 516.6460000000006, 816.6340000000055, 1324.9470000000001, 816.6340000000055, 2741.5570000000007, 758.3029999999999, 949.9619999999995, 708.3050000000003, 733.3040000000037, 1508.273000000001, 2683.2260000000024, 708.3050000000003, 874.9649999999965, 683.3060000000041, 1358.278999999995, 874.9650000000038, 2441.569000000003, 958.2949999999983, 824.9670000000042, 974.961000000003, 2158.247000000003, 858.2989999999991, 858.2989999999991, 908.2970000000059, 833.3000000000029, 1291.614999999998, 908.2969999999987, 2333.239999999998, 1016.6259999999966, 741.6370000000024, 708.3050000000003, 691.6390000000029, 1349.9460000000036, 866.6319999999978, 2499.899999999994, 649.974000000002, 966.6280000000042, 1149.9540000000052, 899.9639999999999, 2358.238999999994, 991.6270000000004, 774.9690000000046, 608.3090000000011, 974.961000000003, 749.9700000000012, 1066.6239999999962, 549.9780000000028, 941.6290000000008, 2791.5550000000003, 1058.2910000000047, 841.6330000000016, 733.3039999999964, 2541.5650000000023, 1049.9579999999987, 599.9760000000024, 916.6299999999974, 891.6310000000012, 1058.2909999999974, 833.3000000000029, 758.3029999999999, 2908.217000000004, 916.6299999999974, 1324.9470000000001, 608.3090000000011, 1049.958000000006, 899.9639999999999, 2699.892, 816.6339999999982, 874.9649999999965, 699.9720000000016, 983.2940000000017, 591.6429999999964, 591.6429999999964, 599.9760000000024, 2966.5480000000025, 808.3009999999995, 791.6349999999948, 791.6349999999948, 2849.8859999999986, 1124.9550000000017, 749.9700000000012, 849.9660000000003, 583.3099999999977, 791.6349999999948, 658.3070000000007, 924.9630000000034, 874.9650000000038, 3166.540000000001, 899.9639999999999, 1066.6239999999962, 741.6370000000024, 883.2980000000025, 991.6270000000004, 659.0360000000001, 542.3740000000034, 900.6929999999993, 3483.9230000000025, 809.0299999999988, 892.3600000000006, 558.3110000000015, 916.6299999999974, 3467.256999999998, 841.6330000000016, 733.3039999999964, 908.2969999999987, 641.6410000000033, 591.6429999999964, 1074.9570000000022, 974.961000000003, 3733.9130000000005, 933.2959999999948, 524.9789999999994, 816.6339999999982, 3525.587999999996, 1324.9470000000001, 949.9619999999995, 883.2979999999952, 3192.2679999999964, 974.961000000003, 574.976999999999, 741.6370000000024, 999.9599999999991, 3191.538999999997, 541.6449999999968, 1058.2910000000047, 633.3079999999973, 916.6299999999974, 766.6359999999986, 508.31299999999464, 958.2950000000055, 749.9700000000012, 2533.2320000000036, 716.637999999999, 966.6280000000042],
        "type": "histogram",
        marker: {
            color: colors.rr,
        },
    }, {
        "name": "Weighted round robin (WRR)",
        "x": [449.98199999999997, 683.306, 641.6410000000001, 1316.6139999999998, 2108.249, 491.64699999999993, 1041.6250000000002, 783.3019999999997, 758.3029999999999, 1241.617, 608.3090000000002, 724.971, 1799.928, 1149.9540000000002, 949.962, 1066.6240000000003, 858.299, 1066.6240000000003, 624.9750000000004, 1024.9589999999998, 683.306, 1224.9510000000005, 1024.9589999999998, 1074.9569999999994, 991.6269999999995, 499.97999999999956, 900.3290000000006, 1258.6480000000001, 1533.6370000000002, 1208.6499999999996, 925.3279999999995, 891.9960000000001, 900.3289999999997, 1041.9899999999998, 708.3050000000003, 949.9619999999995, 1374.9450000000006, 541.6449999999995, 1108.2889999999998, 983.2939999999999, 466.64799999999923, 1333.2800000000007, 641.6409999999996, 1083.29, 949.9620000000004, 1624.9350000000004, 858.299, 1066.6239999999998, 458.3150000000005, 599.9759999999997, 866.6319999999996, 1074.9570000000003, 624.9750000000004, 1299.9479999999994, 574.9770000000008, 699.9720000000007, 1024.958999999999, 1124.955, 733.3040000000001, 608.3090000000011, 1358.2790000000005, 1099.9560000000001, 916.6299999999992, 1674.933000000001, 891.6309999999994, 1391.6110000000008, 1183.286, 1033.2919999999995, 1266.616, 683.3060000000005, 1249.949999999999, 1099.9560000000001, 674.973, 866.6319999999996, 624.9750000000004, 1641.6010000000006, 908.2969999999987, 749.9699999999993, 1783.2619999999988, 1116.6220000000012, 883.2979999999989, 949.9619999999995, 733.3040000000001, 1433.2759999999998, 708.3049999999985, 1383.2780000000002, 1166.619999999999, 1083.2900000000009, 849.9660000000003, 849.9660000000003, 1116.6220000000012, 799.9680000000008, 1174.9529999999995, 1366.6119999999992, 799.9680000000008, 1274.9490000000005, 1249.949999999999, 866.6319999999996, 1283.282000000001, 1066.6239999999998, 1329.6409999999996, 754.6640000000007, 1162.9809999999998, 1421.304, 1037.9860000000008, 871.3259999999991, 658.3070000000007, 1529.6329999999998, 716.637999999999, 858.2990000000009, 1171.3140000000003, 1654.6279999999988, 916.630000000001, 666.6400000000012, 599.9759999999987, 1224.950999999999, 1149.9540000000015, 1041.625, 833.2999999999993, 933.2959999999985, 1108.2890000000007, 683.3060000000005, 566.6440000000002, 1124.954999999998, 516.6460000000006, 1424.9429999999993, 691.6389999999992, 916.630000000001, 1749.9300000000003, 1058.2909999999974, 966.6280000000006, 1124.954999999998, 874.9650000000001, 1174.9529999999977, 1116.6219999999994, 1016.6260000000002, 849.9660000000003, 716.637999999999, 1166.6200000000026, 1508.273000000001, 758.3029999999999, 1083.2900000000009, 1524.9389999999985, 1049.9580000000024, 524.9789999999994, 1324.9470000000001, 1149.9540000000015, 1499.9399999999987, 583.3100000000013, 883.2979999999989, 1066.6239999999998, 1049.9579999999987, 1058.291000000001, 1908.2570000000014, 1058.291000000001, 916.630000000001, 733.3040000000001, 1433.2760000000017, 1474.9410000000025, 899.9640000000036, 1841.5929999999971, 1549.9379999999983, 1333.2799999999988, 933.2959999999985, 1233.2839999999997, 1083.2900000000009, 883.2979999999989, 691.6389999999992, 1299.9480000000003, 491.6469999999972, 1058.2909999999974, 541.6450000000004, 1449.9420000000027, 649.974000000002, 1233.2839999999997, 1008.2930000000015, 858.2989999999991, 1066.6239999999998, 833.2999999999993, 1016.6260000000002, 1316.6140000000014, 1033.2920000000013, 666.6399999999994, 1041.625, 524.979000000003, 999.9599999999991, 1383.278000000002, 891.6310000000012, 883.2979999999989, 933.2959999999985, 1174.9530000000013, 658.3070000000007, 1199.9519999999975, 1249.9500000000007, 774.9689999999973, 1274.9490000000005, 1083.2900000000009, 858.2989999999991, 1358.2790000000023, 841.632999999998, 933.2960000000021, 1308.280999999999, 1658.2669999999998, 1299.9480000000003, 1058.291000000001, 1199.9519999999975, 1024.958999999999, 858.2990000000027, 1258.2829999999994, 874.9649999999965, 1141.6209999999992, 774.969000000001, 1099.956000000002, 983.2940000000017, 583.3100000000013, 724.9710000000014, 624.9749999999985, 1374.9449999999997, 766.6360000000022, 1333.2799999999988, 891.6310000000012, 991.6270000000004, 1208.2850000000035, 524.9789999999994, 1249.9500000000007, 1233.2839999999997, 1441.6090000000004, 891.6309999999976, 1299.9480000000003, 1033.2920000000013, 758.3029999999999, 858.2989999999991, 1291.6150000000016, 1183.2860000000037, 558.3110000000015, 708.3050000000003, 1008.2930000000015, 608.3089999999975, 1041.6250000000036, 699.9720000000016, 1633.2680000000037, 974.961000000003, 1008.2929999999978, 1041.625, 691.6390000000029, 1216.617999999995, 1108.2890000000043, 783.301999999996, 1024.9589999999953, 1433.2760000000053, 916.6300000000047, 1212.836000000003, 887.849000000002, 1204.502999999997, 1021.1770000000033, 1187.8369999999995, 1171.171000000002, 929.5140000000029, 1212.836000000003, 683.3060000000041, 999.9600000000064, 858.2989999999991, 1199.9520000000048, 1649.9339999999938, 958.2949999999983, 1891.5910000000003, 1066.6240000000034, 1291.614999999998, 1141.6209999999992, 983.2940000000017, 741.6370000000024, 533.3119999999981, 1374.9449999999997, 1266.6159999999945, 683.3059999999969, 1499.9400000000023, 899.9639999999999, 1391.6109999999971, 841.6330000000016, 1216.6180000000022, 724.971000000005, 974.9609999999957, 1249.949999999997, 849.9660000000003, 641.640999999996, 1349.9459999999963, 1241.6169999999984, 1016.6259999999966, 1408.2770000000019, 741.6370000000024, 1133.2880000000005, 1541.6050000000032, 1533.2720000000045, 991.6270000000004, 858.2989999999991, 824.9669999999969, 1758.262999999999, 708.3050000000003, 1324.9470000000001, 2258.243000000002, 841.6330000000016, 1283.2820000000065, 774.9690000000046, 1199.9519999999975, 724.9709999999977, 1749.9300000000003, 1374.9449999999997, 858.2989999999991, 1408.2770000000019, 1216.6180000000022, 949.9620000000068, 983.2940000000017, 1183.286, 1041.625, 858.2989999999991, 666.6399999999994, 1233.2839999999997, 1366.612000000001, 1008.2929999999978, 1291.6150000000052, 641.6410000000033, 883.2980000000025, 1208.2849999999962, 916.6299999999974, 1133.2880000000005, 941.6290000000008, 849.9660000000003, 1324.9470000000001, 899.9639999999999, 1449.9420000000027, 1024.9589999999953, 941.6290000000008, 1516.6059999999998, 849.9660000000003, 1266.6160000000018, 974.9609999999957, 933.2960000000021, 1091.6229999999996, 708.3050000000003, 1641.6010000000024, 1449.9420000000027, 891.630999999994, 816.6340000000055, 1624.9349999999977, 974.961000000003, 1241.6169999999984, 1008.2930000000051, 608.3090000000011, 1274.9490000000005, 974.961000000003, 966.627999999997, 1399.9439999999959, 691.6389999999956, 974.9609999999957, 874.9650000000038, 824.9670000000042, 974.9609999999957, 841.6330000000016, 991.6270000000004, 1199.9520000000048, 774.9689999999973, 1024.9590000000026, 699.9720000000016, 716.637999999999, 1241.6169999999984, 1083.2900000000009, 949.9619999999995, 774.9689999999973, 1049.9579999999987, 966.627999999997, 724.9709999999977, 574.976999999999, 916.6300000000047, 849.9660000000003, 741.6370000000024, 983.2939999999944, 516.6460000000006, 1066.6239999999962, 1024.9590000000026, 891.6310000000012, 658.3070000000007, 574.9770000000062, 1491.6070000000036, 741.6370000000024, 958.2949999999983, 1099.9559999999983, 633.3080000000045, 1224.951000000001, 758.3029999999999, 1333.2799999999988, 1258.283000000003, 891.6310000000012, 1008.2930000000051, 1291.614999999998, 1099.9560000000056, 491.6470000000045, 1233.2839999999997, 991.6270000000004, 1308.2810000000027, 591.6429999999964, 1308.2809999999954, 816.6339999999982, 724.9709999999977, 1475.6700000000055, 992.3559999999998, 1217.3470000000016, 866.6319999999978, 1359.0080000000016, 708.3050000000003, 1117.350999999995, 633.3079999999973, 1484.002999999997, 1049.9579999999987, 1449.9420000000027, 1008.2929999999978, 1124.9550000000017, 1058.2910000000047, 1141.6209999999992, 916.6299999999974, 824.9669999999969, 783.3020000000033, 1499.9400000000023, 908.2969999999987, 699.9720000000016, 1299.948000000004, 1183.286, 1024.9590000000026, 1474.940999999999, 599.9760000000024, 1133.2880000000005, 741.6370000000024, 1074.9569999999949, 1299.9479999999967, 858.2989999999991, 1074.9570000000022, 724.9709999999977, 1291.614999999998, 1141.6210000000065, 883.2979999999952, 1258.283000000003, 891.6310000000012, 1424.9429999999993],
        "type": "histogram",
        marker: {
            color: colors.wrr,
        },
    }, {
        "name": "Least connections (LC)",
        "x": [949.962, 858.299, 758.3030000000001, 1041.6249999999998, 791.635, 1516.606, 758.3030000000001, 683.306, 1274.9490000000003, 716.6379999999999, 741.6370000000002, 1033.292, 524.9790000000003, 808.3009999999999, 1649.9339999999997, 599.9760000000001, 1949.922, 958.2950000000001, 666.6399999999994, 974.9609999999998, 758.3029999999994, 674.973, 2049.9179999999997, 733.3039999999996, 1349.946, 708.3050000000003, 874.9650000000001, 1183.6509999999998, 891.9960000000001, 650.3389999999999, 458.3149999999996, 724.9710000000005, 983.6589999999997, 1583.6350000000002, 1333.6450000000004, 841.6329999999998, 783.3019999999997, 1900.2889999999998, 1016.6259999999993, 974.9610000000002, 991.6270000000004, 1041.625, 783.3019999999997, 991.6270000000004, 708.3049999999994, 608.3090000000002, 766.6359999999995, 708.3050000000003, 558.3109999999997, 1508.2730000000001, 841.6329999999998, 1166.619999999999, 924.9630000000006, 841.6329999999998, 791.6349999999993, 766.6360000000004, 1083.2900000000009, 683.3060000000005, 1008.2929999999997, 566.6440000000002, 449.98199999999997, 858.2990000000009, 683.3059999999987, 1091.6229999999996, 1641.6010000000006, 974.9609999999993, 633.3079999999991, 824.9670000000006, 566.6440000000002, 1299.9480000000003, 533.3119999999999, 483.3140000000003, 1024.958999999999, 908.2970000000005, 1324.9470000000001, 808.3010000000013, 499.97999999999956, 724.9709999999995, 558.3109999999997, 1183.286, 824.9669999999987, 716.637999999999, 958.2950000000001, 533.3119999999999, 1333.2800000000007, 883.2980000000007, 1099.9560000000001, 991.6270000000004, 924.9629999999997, 1208.2849999999999, 716.637999999999, 899.9639999999999, 708.3050000000003, 1116.6220000000012, 1524.9390000000003, 474.98099999999977, 899.9639999999999, 1008.2929999999997, 941.6290000000008, 749.9699999999993, 858.2990000000009, 866.6319999999996, 1304.6419999999998, 529.6729999999989, 954.6560000000009, 563.005000000001, 1421.304, 896.3250000000007, 1612.9629999999997, 741.6369999999988, 1091.6229999999996, 699.9719999999979, 641.6409999999996, 649.9739999999983, 916.6299999999992, 1808.2610000000004, 1024.9590000000007, 808.3009999999995, 574.976999999999, 749.9699999999975, 716.637999999999, 1558.2710000000006, 1083.2900000000009, 708.3050000000003, 891.6310000000012, 1249.9500000000007, 891.6310000000012, 2066.5840000000026, 1083.2900000000009, 949.9619999999995, 449.98199999999997, 716.637999999999, 858.2989999999991, 1249.9500000000007, 916.630000000001, 466.64800000000105, 983.2940000000017, 1158.2870000000003, 499.97999999999956, 749.9700000000012, 1016.6260000000002, 1341.6129999999976, 774.969000000001, 999.9600000000028, 2041.5849999999991, 849.9660000000003, 1149.953999999998, 566.6440000000002, 858.2989999999991, 791.635000000002, 858.2989999999991, 783.3019999999997, 758.3029999999999, 874.9650000000001, 2083.25, 674.9730000000018, 1058.2909999999974, 1333.2800000000025, 916.6299999999974, 1191.6189999999988, 799.9679999999971, 749.9700000000012, 549.9779999999992, 849.9660000000003, 1066.6239999999998, 1524.9390000000021, 858.2989999999991, 866.6319999999978, 558.3109999999979, 1616.6020000000026, 1049.9579999999987, 983.293999999998, 766.6359999999986, 933.2960000000021, 766.6360000000022, 1733.2639999999992, 1008.2930000000015, 933.2960000000021, 1108.288999999997, 833.2999999999993, 833.2999999999993, 691.6390000000029, 1433.275999999998, 633.3080000000009, 799.9680000000008, 1499.9399999999987, 1316.6140000000014, 916.630000000001, 524.9789999999994, 824.9670000000006, 1316.6139999999978, 958.2949999999983, 916.630000000001, 891.6310000000012, 1233.2839999999997, 599.9759999999987, 908.2969999999987, 1466.6080000000002, 874.9650000000001, 1349.946, 891.6310000000012, 1233.2839999999997, 924.9630000000034, 908.2969999999987, 499.97999999999956, 949.9620000000032, 966.6280000000006, 908.2969999999987, 1333.2799999999988, 691.6389999999992, 974.9609999999993, 816.6339999999982, 1016.6260000000002, 624.9750000000022, 1058.291000000001, 874.9650000000001, 1224.951000000001, 949.9619999999995, 708.3050000000003, 724.9709999999977, 1199.9519999999975, 749.9700000000012, 749.9699999999975, 566.6440000000002, 1166.6200000000026, 1058.291000000001, 916.6299999999974, 866.6320000000014, 874.9650000000001, 816.6340000000018, 1616.6020000000026, 766.6360000000022, 649.974000000002, 1183.2860000000037, 808.3009999999995, 1508.273000000001, 1041.625, 999.9600000000028, 908.2970000000023, 558.3109999999942, 1916.5900000000001, 808.3009999999995, 724.9709999999977, 1274.9490000000005, 824.9670000000042, 641.6410000000033, 1483.2739999999976, 841.6330000000016, 966.627999999997, 841.6329999999944, 458.3150000000023, 991.6270000000004, 524.9789999999994, 646.1920000000027, 1179.5040000000008, 971.1789999999964, 896.1820000000007, 921.1810000000041, 862.8499999999985, 816.6339999999982, 699.9720000000016, 691.6390000000029, 1108.2890000000043, 708.3050000000003, 924.9629999999961, 641.6410000000033, 466.64800000000105, 941.6289999999935, 899.9639999999999, 1724.9310000000041, 791.635000000002, 983.2939999999944, 908.2969999999987, 866.6319999999978, 824.9669999999969, 741.6369999999952, 1183.286, 999.9599999999991, 1158.287000000004, 1166.6200000000026, 1066.6239999999962, 883.2979999999952, 883.2980000000025, 1491.6069999999963, 566.6440000000002, 974.961000000003, 1183.286, 708.3050000000003, 1366.612000000001, 916.6299999999974, 641.6410000000033, 933.2959999999948, 1658.2669999999998, 1091.6229999999996, 733.3040000000037, 524.9789999999994, 949.9619999999995, 1949.9219999999987, 766.6360000000059, 716.637999999999, 824.9670000000042, 1633.2680000000037, 849.9660000000003, 1008.2929999999978, 958.2949999999983, 708.3050000000003, 949.9619999999995, 591.6429999999964, 908.2969999999987, 1166.6200000000026, 649.974000000002, 908.2969999999987, 658.3070000000007, 1324.9470000000001, 1324.9470000000001, 999.9599999999991, 741.6370000000024, 899.9639999999999, 541.6449999999968, 1033.2920000000013, 499.9799999999959, 858.2989999999991, 816.6339999999982, 1316.6139999999941, 824.9669999999969, 1399.9440000000031, 733.3040000000037, 699.9720000000016, 883.2980000000025, 683.3059999999969, 608.3090000000011, 883.2979999999952, 508.3130000000019, 941.6290000000008, 749.9699999999939, 1041.625, 1741.5970000000016, 708.3050000000003, 816.6340000000055, 749.9700000000012, 833.2999999999956, 1008.2929999999978, 683.3060000000041, 1324.9470000000001, 983.2940000000017, 758.3029999999999, 1541.6050000000032, 766.6359999999986, 741.6370000000024, 474.98099999999977, 1141.6209999999992, 1516.6059999999998, 574.976999999999, 916.6299999999974, 924.9630000000034, 974.9609999999957, 874.9650000000038, 1724.9309999999969, 791.635000000002, 849.9660000000003, 1274.9490000000005, 908.2969999999987, 1433.275999999998, 1041.625, 616.6419999999998, 1174.9530000000013, 883.2980000000025, 1274.9490000000005, 908.2969999999987, 574.9770000000062, 549.9780000000028, 1041.625, 1041.625, 899.9639999999999, 1749.9300000000003, 833.3000000000029, 1224.951000000001, 616.6419999999998, 924.9630000000034, 899.9639999999999, 591.6429999999964, 799.9680000000008, 974.961000000003, 1674.9329999999973, 2349.9060000000027, 566.6440000000002, 1458.2750000000015, 958.2949999999983, 1199.9519999999975, 849.9660000000003, 833.3000000000029, 816.6339999999982, 824.9670000000042, 716.637999999999, 874.9650000000038, 749.9700000000012, 1608.2690000000002, 908.2969999999987, 1024.9590000000026, 991.6270000000004, 983.2940000000017, 849.9660000000003, 850.6949999999997, 2367.3009999999995, 1150.6829999999973, 1142.3500000000058, 1092.351999999999, 766.6359999999986, 1067.3530000000028, 1058.2910000000047, 1334.0089999999982, 866.6319999999978, 499.9800000000032, 791.6349999999948, 1599.9360000000015, 1066.6240000000034, 891.6310000000012, 1016.6259999999966, 766.6360000000059, 2016.586000000003, 974.9609999999957, 983.2940000000017, 1541.604999999996, 883.2980000000025, 499.9800000000032, 1183.286, 708.3050000000003, 1133.2880000000005, 908.2969999999987, 666.6399999999994, 816.6339999999982, 474.98099999999977, 799.9680000000008, 999.9600000000064, 791.6349999999948, 1324.9470000000001, 883.2980000000025, 1333.2799999999988, 741.6369999999952, 1033.2920000000013, 816.6340000000055, 1524.9390000000058],
        "type": "histogram",
        marker: {
            color: colors.lc,
        },
    }]
    let histogramLayout = {
        xaxis: {
            title: "Response time (ms)",
        },
        yaxis: {
            title: "Number of requests",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };

    Plotly.newPlot('histogram-1', histogramData, histogramLayout, { staticPlot: true });

    let mediansData = [
        {
            name: 'Round Robin (RR) 50%ile',
            type: 'scatter',
            y: [524.979, 904.1305000000001, 904.1305000000001, 904.1305000000001, 908.2970000000003, 908.2970000000003, 899.9639999999999, 908.2970000000003, 887.4644999999998, 874.9649999999997, 887.4644999999998, 874.9649999999997, 862.4655000000002, 858.2989999999995, 858.299, 858.2989999999991, 858.299, 854.1324999999997, 858.299, 866.6319999999996, 862.4655000000002, 866.6320000000005, 866.6320000000014, 866.6320000000014, 866.6320000000014, 866.6319999999996, 866.6319999999996, 866.6319999999996, 866.6319999999987, 866.6319999999987, 866.6319999999996, 866.6320000000014, 866.6320000000005, 866.6320000000014, 866.6320000000014, 866.6320000000014, 866.6320000000014, 866.6319999999996, 866.6319999999996, 866.6319999999996, 866.6320000000014, 866.6319999999996, 866.6319999999996, 866.6320000000005, 866.6320000000014, 866.6320000000014, 870.798499999999, 874.9649999999965, 874.9649999999999, 874.9650000000001, 874.9650000000001, 874.9649999999999, 874.9649999999965, 874.9649999999981, 874.9650000000001, 874.9650000000001, 874.9650000000001, 874.965000000002, 874.965000000002, 874.965000000002],
            marker: {
                color: colors.rr,
            },
        },
        {
            name: 'Weighted Round Robin (WRR) 50%ile',
            type: 'scatter',
            y: [566.644, 733.3039999999999, 783.3019999999997, 949.962, 991.6269999999995, 949.962, 949.9620000000004, 949.962, 949.962, 949.9620000000004, 966.6280000000002, 949.9620000000004, 949.9620000000002, 966.6280000000002, 991.6269999999995, 991.6269999999995, 991.6269999999995, 966.6280000000002, 991.6269999999995, 1004.1264999999999, 1024.958999999999, 1024.9589999999998, 1033.2919999999995, 1033.2919999999995, 1024.9589999999998, 1024.9589999999998, 1024.9589999999998, 1024.9589999999998, 1029.1254999999996, 1024.9589999999998, 1024.9589999999994, 1024.9589999999998, 1024.9589999999994, 1024.9589999999998, 1024.9589999999994, 1024.958999999999, 1024.9589999999998, 1024.9589999999998, 1024.9589999999994, 1024.9589999999994, 1024.9589999999998, 1024.9589999999998, 1029.1254999999996, 1024.9589999999998, 1024.9589999999998, 1024.9589999999994, 1024.9589999999994, 1024.958999999997, 1021.1770000000033, 1021.1770000000033, 1016.6259999999966, 1008.2930000000051, 1008.2930000000015, 1008.2930000000051, 1008.2930000000051, 1008.2930000000051, 1012.4595000000008, 1012.4595000000008, 1016.6259999999984, 1016.6260000000002],
            marker: {
                color: colors.wrr,
            },
        },
        {
            name: 'Least Connections (LC) 50%ile',
            type: 'scatter',
            y: [949.962, 858.299, 808.3009999999999, 799.968, 858.299, 849.9659999999999, 866.6320000000001, 849.9659999999999, 841.6329999999998, 841.6329999999998, 841.6329999999998, 841.6329999999998, 841.6329999999998, 858.2990000000009, 858.2990000000009, 858.2990000000009, 858.2990000000009, 870.7984999999999, 870.7984999999999, 874.9650000000001, 866.6319999999996, 870.7984999999999, 870.7984999999999, 866.6319999999996, 874.9650000000001, 874.9650000000001, 883.2980000000007, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.9960000000001, 891.8135000000007, 891.9960000000001, 896.1820000000007, 891.9960000000001, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 894.0890000000004, 896.1820000000007, 891.6310000000012, 894.0890000000004, 899.9639999999999, 896.3250000000007, 899.9639999999999, 898.1445000000003, 898.1445000000003],
            marker: {
                color: colors.lc,
            },
        },
    ];
    let mediansLayout = {
        xaxis: {
            title: "Time elapsed (seconds)",
        },
        yaxis: {
            title: "Response time (ms)",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };
    Plotly.newPlot('graph-medians', mediansData, mediansLayout, { staticPlot: true });

    let graphData = [
        {
            name: 'Round Robin (RR) 95%ile',
            type: 'scatter',
            y: [524.979, 1478.6908499999993, 1231.2007500000002, 1635.3512499999995, 1773.2623999999996, 1860.7589000000005, 1936.5892, 1893.2576, 1848.6942999999999, 1925.7562999999996, 2036.1685499999999, 2033.2519999999995, 2037.8351500000003, 2049.0847000000003, 2111.8741999999997, 2275.0915000000005, 2439.9024000000004, 2413.5770000000007, 2378.1908000000003, 2343.2977000000005, 2311.2393499999994, 2282.3322500000017, 2311.5741999999987, 2339.7535, 2433.236000000001, 2473.2343999999994, 2449.9020000000005, 2493.233599999998, 2469.9011999999993, 2443.235599999999, 2423.2364, 2414.9033999999992, 2401.570599999998, 2386.312799999999, 2363.6607999999997, 2351.6306999999993, 2339.7535, 2330.845599999999, 2308.241, 2281.575399999999, 2264.9093999999996, 2287.4085000000023, 2308.657650000001, 2323.657049999999, 2342.722799999999, 2337.5119999999984, 2351.3959999999993, 2356.4194999999972, 2401.570599999999, 2391.570999999998, 2436.152550000001, 2441.152350000003, 2476.5675999999958, 2499.899999999996, 2499.899999999999, 2508.233000000001, 2519.8992000000026, 2539.4817500000026, 2543.2079000000012, 2541.799700000002],
            marker: {
                color: colors.rr,
            },
        },
        {
            name: 'Round Robin (RR) 99%ile',
            type: 'scatter',
            y: [524.979, 1775.6789700000002, 1726.1809499999997, 1809.6776099999997, 1927.92288, 2056.6440399999997, 2080.1211999999996, 2073.4255999999996, 2065.8930499999997, 2067.208080000001, 2202.3450299999986, 2180.204800000001, 2440.5690400000008, 2508.3996599999996, 2782.0764799999997, 2780.3582, 2778.06716, 2776.0625, 2773.48508, 2771.1940400000003, 2769.18938, 2767.4710999999998, 2764.89368, 2763.175400000001, 2760.3116, 2758.020560000001, 2756.0159000000012, 2753.15684, 2748.1617800000004, 2742.4531399999996, 2736.030920000001, 2732.46302, 2726.7543799999985, 2721.759319999999, 2714.623519999999, 2710.342039999999, 2704.6334, 2700.35192, 2693.9296999999974, 2688.221059999998, 2684.6531599999976, 2677.5078799999987, 2733.973970000001, 2729.307490000002, 2725.2243199999994, 2720.5578400000004, 2716.474670000001, 2712.3915000000015, 2746.898070000001, 2746.246720000001, 2762.31626, 2784.80527, 2793.55492, 2811.1375499999995, 2849.0526999999997, 2902.3839000000025, 2957.2150400000014, 3185.8359999999975, 3192.0274299999965, 3191.983689999997],
            marker: {
                color: colors.rr,
            },
        },
        {
            name: 'Weighted Round Robin (WRR) 95%ile',
            type: 'scatter',
            y: [671.6398, 1831.1767499999992, 1892.4242999999997, 1751.5965999999994, 1666.7825000000003, 1586.895199999999, 1597.5456, 1561.0264, 1542.7667999999996, 1597.5456, 1629.1015000000004, 1641.6010000000006, 1634.1013000000005, 1627.4349000000002, 1615.8051999999996, 1631.6014000000005, 1624.9350000000004, 1592.9806999999996, 1629.9348000000005, 1620.3700999999994, 1579.2860000000003, 1629.1015000000004, 1638.2678000000003, 1631.6014000000005, 1626.6016000000004, 1594.9361999999992, 1572.4370999999976, 1549.1229499999981, 1591.1863499999981, 1557.437699999998, 1547.4928499999985, 1540.1573999999991, 1549.1229499999981, 1545.0476999999987, 1539.3423499999994, 1533.6370000000002, 1594.9361999999992, 1561.187549999997, 1545.8627499999989, 1542.6025499999992, 1557.4376999999959, 1630.7681000000025, 1627.8515500000012, 1617.4352999999985, 1591.1863500000004, 1568.6872499999988, 1624.935, 1624.9349999999986, 1624.9349999999977, 1602.435899999997, 1572.437099999999, 1549.1046999999987, 1546.6048, 1543.271600000002, 1540.0114000000021, 1537.2226000000014, 1534.0353999999998, 1533.5457500000011, 1533.3632500000035, 1533.0900500000043],
            marker: {
                color: colors.wrr,
            },
        },
        {
            name: 'Weighted Round Robin (WRR) 99%ile',
            type: 'scatter',
            y: [680.97276, 2052.8345499999996, 2065.0840599999997, 2040.41838, 2015.7526999999998, 1997.2534400000002, 1966.4213399999996, 1941.7556600000003, 1929.4228200000005, 1904.757140000001, 1877.00825, 1861.592200000001, 1833.8433099999997, 1809.1776300000004, 1799.5946800000002, 1797.92808, 1796.5947999999999, 1795.4281799999999, 1794.2615599999997, 1793.0949399999997, 1791.5949999999993, 1848.6760499999996, 1865.5920399999977, 1860.2589199999984, 1856.259079999998, 1849.592679999998, 1845.5928399999975, 1841.1763499999975, 1837.8431499999972, 1834.0932999999973, 1832.0100499999983, 1828.2601999999983, 1824.5103499999987, 1822.427099999998, 1819.5105499999986, 1816.593999999998, 1857.5923599999978, 1853.0925399999987, 1849.0926999999965, 1847.0927799999984, 1842.5929599999963, 1888.59112, 1885.0912600000001, 1880.5914399999983, 1877.0915799999984, 1874.0916999999981, 1870.0918599999986, 1865.0920599999972, 1861.5921999999973, 1858.592319999997, 1854.5924799999975, 1850.592639999998, 1847.5927599999977, 1843.5929199999982, 1839.9263999999964, 1837.009849999997, 1833.6766499999978, 1831.1767499999978, 1827.010249999997, 1824.5103499999973],
            marker: {
                color: colors.wrr,
            },
        },
        {
            name: 'Least Connections (LC) 95%ile',
            type: 'scatter',
            y: [949.962, 1374.1116999999995, 1556.6043999999997, 1904.9237999999993, 1829.9267999999993, 1907.7339499999998, 1837.7002499999999, 1737.5582499999982, 1646.6190499999996, 1646.6008000000002, 1643.2676000000004, 1635.8044, 1612.6180000000004, 1589.4316, 1568.9610000000002, 1592.4334000000001, 1614.3948999999998, 1631.5776999999998, 1620.1225, 1610.0302, 1627.2820000000002, 1642.8509500000005, 1634.4415000000004, 1626.6016000000018, 1641.6010000000006, 1631.6014000000014, 1624.1017000000015, 1616.0561500000022, 1614.7825000000012, 1613.3269, 1605.6309999999999, 1614.600550000001, 1613.1449499999999, 1615.3283500000016, 1613.8727500000005, 1610.0301999999992, 1614.7825000000012, 1613.50885, 1607.0974, 1614.4186000000009, 1616.6020000000026, 1616.6020000000026, 1616.6020000000026, 1616.238100000002, 1614.7825000000012, 1616.6020000000026, 1616.0561500000022, 1614.4186000000009, 1616.6020000000026, 1615.3283500000016, 1614.4186000000009, 1616.6020000000026, 1624.9350000000031, 1619.9352000000026, 1630.768100000003, 1624.9350000000031, 1618.268600000002, 1626.6016000000027, 1622.4351000000024, 1616.6020000000026],
            marker: {
                color: colors.lc,
            },
        },
        {
            name: 'Least Connections (LC) 99%ile',
            type: 'scatter',
            y: [949.962, 1488.1071399999996, 1631.2680799999998, 2026.9189199999996, 2021.9191199999996, 2012.91948, 2004.9197999999997, 1996.9201199999998, 1988.9204399999999, 1981.9207199999992, 1973.9210399999995, 1967.9212799999991, 1959.9215999999992, 1951.9219199999995, 1947.4403500000003, 1942.97338, 1940.4917300000002, 2022.9190800000001, 2014.9194000000002, 2007.919680000001, 2045.7514999999994, 2057.084380000001, 2055.7511000000004, 2054.5844800000004, 2053.2512, 2051.91792, 2050.9179599999998, 2049.6680099999994, 2049.0846999999994, 2048.4180599999995, 2047.8347499999995, 2047.3347699999995, 2046.668129999999, 2046.0014899999994, 2045.3348499999993, 2044.7515399999993, 2044.0848999999994, 2043.5015899999994, 2042.9182799999994, 2042.251639999999, 2040.6683699999999, 2034.2519600000005, 2028.7521800000006, 2021.4191399999968, 2014.0860999999982, 2005.8364300000007, 2002.169909999999, 1993.9202400000013, 1988.4204600000012, 1980.1707899999983, 1975.587639999997, 1969.1712299999979, 2042.4182999999994, 2041.9183199999993, 2049.6680099999994, 2049.0846999999994, 2048.4180599999995, 2047.5847599999993, 2047.1681099999996, 2046.5014699999992],
            marker: {
                color: colors.lc,
            },
        },
    ];
    let graphLayout = {
        xaxis: {
            title: "Time elapsed (seconds)",
        },
        yaxis: {
            title: "Response time (ms)",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };
    Plotly.newPlot('graph-higher', graphData, graphLayout, { staticPlot: true });

    let droppedData = [
        {
            name: 'Round Robin (RR)',
            type: 'scatter',
            y: [0, 0, 0, 0, 1, 2, 3, 3, 5, 7, 8, 9, 10, 13, 14, 16, 18, 20, 23, 24, 26, 27, 29, 31, 31, 34, 34, 36, 37, 39, 40, 41, 42, 44, 46, 47, 48, 49, 51, 52, 54, 55, 55, 56, 58, 59, 61, 62, 63, 65, 68, 70, 71, 72, 75, 75, 76, 78, 79, 80],
            marker: {
                color: colors.rr,
            },
        },
        {
            name: 'Weighted Round Robin (WRR)',
            type: 'scatter',
            y: [0, 0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8, 8, 8, 8, 10, 10, 11, 12, 14, 14, 16, 16, 17, 17, 17, 17, 17, 19, 20, 20, 21, 22, 23, 23, 23, 24, 25, 26, 26, 27, 28, 29, 31, 31, 31, 32, 32, 32, 33, 33, 34, 35, 35, 35, 35, 35],
            marker: {
                color: colors.wrr,
            },
        },
        {
            name: 'Least Connections (LC)',
            type: 'scatter',
            y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12],
            marker: {
                color: colors.lc,
            },
        },
    ];
    let droppedLayout = {
        xaxis: {
            title: "Time elapsed (seconds)",
        },
        yaxis: {
            title: "Requests dropped (cumulative)",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };
    Plotly.newPlot('graph-dropped', droppedData, droppedLayout, { staticPlot: true });

    new Simulation({
        element: document.getElementById("13"),
        numServers: 6,
        serverPower: [4, 5, 6, 7, 8, 9],
        rps: 8,
        requestCost: { min: 100, max: 100 },
        queueMaxLength: 3,
        algorithm: "peak-exponentially-weighted-moving-average",
    });

    let pewmaData = [
        {
            "x": [1891.591, 774.969, 858.299, 816.634, 1241.6170000000002, 799.9680000000003, 1008.2930000000001, 691.6389999999997, 1033.2920000000004, 1224.951, 724.971, 1224.9509999999996, 933.2960000000003, 1024.9590000000003, 716.6379999999999, 933.2959999999998, 724.9709999999995, 1016.6259999999997, 1549.938, 766.6360000000004, 1066.6239999999998, 1058.2909999999993, 841.6329999999998, 616.6419999999998, 1074.9570000000003, 1208.2849999999999, 1074.9570000000003, 941.6289999999999, 733.3040000000001, 916.6300000000001, 824.9669999999996, 1533.272, 808.3010000000004, 891.6310000000003, 1158.2870000000003, 949.9620000000004, 858.299, 1133.2879999999996, 699.9719999999998, 1108.2889999999998, 591.643, 899.9639999999999, 1033.2920000000004, 716.6379999999999, 691.6389999999992, 1724.9310000000005, 699.9719999999998, 1241.6170000000002, 699.9720000000007, 474.98099999999977, 766.6360000000004, 591.643, 674.973, 891.6310000000012, 666.6400000000012, 591.643, 1033.2919999999995, 1599.9360000000015, 958.2949999999983, 758.3029999999999, 719.6449999999986, 702.9789999999994, 1127.9620000000014, 686.3130000000001, 969.6350000000002, 633.3079999999991, 944.6359999999986, 886.3050000000003, 541.6449999999986, 1124.955, 1024.9590000000007, 899.9639999999999, 566.6440000000002, 958.2950000000001, 1274.9490000000005, 691.639000000001, 849.9660000000003, 1499.9399999999987, 1074.9569999999985, 883.2980000000007, 791.6350000000002, 1083.289999999999, 741.6370000000006, 724.9710000000014, 1191.6189999999988, 1174.9529999999995, 974.9609999999993, 958.2950000000001, 783.3019999999997, 683.3060000000005, 1383.2780000000002, 999.960000000001, 908.2970000000005, 808.3009999999995, 841.6329999999998, 666.6400000000012, 808.3009999999995, 891.6309999999994, 708.3050000000003, 591.643, 1049.9580000000005, 824.9669999999987, 1499.9399999999987, 791.6350000000002, 733.3040000000001, 1058.2909999999993, 774.969000000001, 1308.2810000000009, 1091.6230000000014, 799.9679999999971, 641.6409999999996, 791.635000000002, 766.6359999999986, 1308.280999999999, 858.2989999999991, 1674.932999999999, 774.969000000001, 866.6320000000014, 833.2999999999993, 1283.2819999999992, 716.637999999999, 691.6389999999992, 1241.617000000002, 699.9720000000016, 549.9779999999992, 741.6369999999988, 1358.2789999999986, 1299.9480000000003, 791.635000000002, 574.976999999999, 933.2959999999985, 683.3060000000005, 958.2950000000019, 491.64700000000084, 791.6349999999984, 883.2979999999989, 908.2969999999987, 724.9710000000014, 774.9689999999973, 933.2959999999985, 1441.6090000000004, 966.6280000000006, 849.9660000000003, 783.3019999999997, 816.6339999999982, 1158.2869999999966, 874.9650000000001, 1041.625, 691.6389999999992, 941.6290000000008, 666.6399999999994, 874.9650000000001, 674.9729999999981, 1499.9399999999987, 908.2969999999987, 733.3040000000001, 724.9710000000014, 658.3069999999971, 1208.2849999999999, 1008.2930000000015, 833.3000000000029, 616.6419999999998, 774.969000000001, 858.2989999999991, 499.97999999999956, 941.6290000000008, 1516.6059999999998, 1074.9570000000022, 849.9660000000003, 1141.6210000000028, 783.3019999999997, 1241.6169999999984, 924.9629999999997, 1141.6209999999992, 999.9599999999991, 916.630000000001, 683.3060000000005, 833.2999999999993, 1491.607, 774.969000000001, 891.6309999999976, 1174.9530000000013, 691.6389999999992, 858.2989999999991, 899.9639999999999, 916.630000000001, 783.3019999999997, 749.9700000000012, 558.3109999999979, 741.6369999999988, 874.9650000000001, 1566.6039999999994, 924.9629999999997, 916.630000000001, 816.6339999999982, 1099.956000000002, 783.3019999999997, 1216.6180000000022, 1108.2890000000007, 633.3079999999973, 816.6340000000018, 1033.2919999999976, 774.969000000001, 958.2950000000019, 1599.9360000000015, 866.6320000000014, 1058.291000000001, 933.2959999999985, 833.2999999999993, 749.9700000000012, 1167.3430000000008, 992.3500000000022, 925.6859999999979, 875.6880000000019, 759.0260000000017, 800.6909999999989, 1225.673999999999, 824.9670000000006, 966.627999999997, 691.6390000000029, 708.3050000000003, 958.2949999999983, 791.6349999999984, 1208.2849999999999, 1708.2649999999994, 833.2999999999993, 966.627999999997, 558.3110000000052, 991.6270000000004, 1016.6259999999966, 891.6309999999976, 1033.2919999999976, 883.2980000000025, 916.6299999999974, 541.6450000000041, 774.9689999999973, 1408.2769999999982, 1041.625, 958.2950000000055, 866.6319999999978, 991.6270000000004, 783.3020000000033, 908.2970000000059, 1283.2819999999992, 683.3059999999969, 974.961000000003, 866.6319999999978, 699.9720000000016, 933.2959999999948, 733.3040000000037, 891.6310000000012, 566.6440000000002, 499.9800000000032, 1074.9569999999949, 1224.951000000001, 733.3040000000037, 1449.9419999999955, 533.3119999999981, 724.971000000005, 1024.9589999999953, 974.9609999999957, 624.9749999999985, 924.9630000000034, 866.6319999999978, 658.3070000000007, 941.6290000000008, 591.6430000000037, 458.31499999999505, 1041.625, 799.9680000000008, 724.9709999999977, 583.3099999999977, 874.9650000000038, 883.2979999999952, 716.637999999999, 1041.625, 974.961000000003, 774.9689999999973, 1649.934000000001, 774.9689999999973, 599.9760000000024, 874.9649999999965, 1258.2829999999958, 566.6440000000002, 841.6330000000016, 983.2940000000017, 941.9910000000018, 808.6630000000005, 567.0060000000012, 925.3250000000044, 833.6619999999966, 783.663999999997, 716.637999999999, 666.6399999999994, 1174.9530000000013, 1216.6180000000022, 733.3040000000037, 699.9720000000016, 991.6270000000004, 633.3079999999973, 983.2940000000017, 883.2980000000025, 933.2959999999948, 899.9639999999999, 691.6389999999956, 691.6389999999956, 1233.2839999999997, 633.3080000000045, 799.9680000000008, 1499.9400000000023, 799.9680000000008, 983.2940000000017, 874.9649999999965, 758.3029999999999, 683.3059999999969, 1091.6229999999996, 758.3029999999999, 1341.6130000000048, 733.3040000000037, 924.9630000000034, 774.9689999999973, 1024.9590000000026, 1591.6029999999955, 599.9760000000024, 999.9600000000064, 1141.6209999999992, 1091.6229999999996, 1158.287000000004, 966.627999999997, 774.9690000000046, 691.6390000000029, 458.3150000000023, 924.9630000000034, 1541.604999999996, 874.9649999999965, 1008.2929999999978, 666.6399999999994, 858.2989999999991, 824.9669999999969, 874.9649999999965, 899.9639999999999, 799.9680000000008, 1016.6260000000038, 716.637999999999, 758.3029999999999, 891.630999999994, 633.3079999999973, 566.6440000000002, 1483.2739999999976, 1099.9559999999983, 816.6339999999982, 1099.9559999999983, 908.2970000000059, 799.9680000000008, 516.6460000000006, 1024.9590000000026, 633.3080000000045, 708.3050000000003, 1266.6160000000018, 1008.2930000000051, 533.3120000000054, 874.9649999999965, 774.9689999999973, 649.974000000002, 924.9630000000034, 841.6330000000016, 791.6349999999948, 716.637999999999, 1249.949999999997, 916.6299999999974, 816.6339999999982, 983.2940000000017, 1233.2839999999997, 874.9649999999965, 1733.2640000000029, 633.3079999999973, 874.9650000000038, 908.2969999999987, 716.637999999999, 1383.2780000000057, 1041.625, 708.3050000000003, 1033.2920000000013, 683.3059999999969, 1341.6130000000048, 1108.288999999997, 791.635000000002, 933.2960000000021, 691.6389999999956, 849.9660000000003, 783.301999999996, 924.9629999999961, 1049.9579999999987, 924.9630000000034, 824.9669999999969, 674.9729999999981, 1216.6180000000022, 1091.6229999999996, 1024.9590000000026, 949.9619999999995, 991.6270000000004, 816.6339999999982, 1049.9579999999987, 891.630999999994, 533.3119999999981, 866.6320000000051, 1091.6230000000069, 791.635000000002, 1058.2909999999974, 849.9659999999931, 1091.6229999999996, 691.6390000000029, 883.2980000000025, 1199.9520000000048, 791.635000000002, 983.2939999999944, 883.2980000000025, 1316.6140000000014, 783.301999999996, 1116.622000000003, 991.6270000000004, 799.9680000000008, 1091.6229999999996, 1066.6239999999962, 499.9799999999959, 1049.9579999999987, 1083.2900000000009, 958.2949999999983, 741.6370000000024, 1091.6229999999996, 566.6440000000002, 841.6330000000016, 633.3079999999973, 808.3009999999995, 558.3110000000015, 913.185000000005, 754.8580000000002, 904.851999999999, 879.8530000000028, 1704.820000000007, 783.3020000000033, 1338.1679999999978],
            name: "PEWMA",
            "type": "histogram",
            marker: {
                color: colors.pewma,
            }
        }, {
            "name": "Least connections (LC)",
            "x": [949.962, 858.299, 758.3030000000001, 1041.6249999999998, 791.635, 1516.606, 758.3030000000001, 683.306, 1274.9490000000003, 716.6379999999999, 741.6370000000002, 1033.292, 524.9790000000003, 808.3009999999999, 1649.9339999999997, 599.9760000000001, 1949.922, 958.2950000000001, 666.6399999999994, 974.9609999999998, 758.3029999999994, 674.973, 2049.9179999999997, 733.3039999999996, 1349.946, 708.3050000000003, 874.9650000000001, 1183.6509999999998, 891.9960000000001, 650.3389999999999, 458.3149999999996, 724.9710000000005, 983.6589999999997, 1583.6350000000002, 1333.6450000000004, 841.6329999999998, 783.3019999999997, 1900.2889999999998, 1016.6259999999993, 974.9610000000002, 991.6270000000004, 1041.625, 783.3019999999997, 991.6270000000004, 708.3049999999994, 608.3090000000002, 766.6359999999995, 708.3050000000003, 558.3109999999997, 1508.2730000000001, 841.6329999999998, 1166.619999999999, 924.9630000000006, 841.6329999999998, 791.6349999999993, 766.6360000000004, 1083.2900000000009, 683.3060000000005, 1008.2929999999997, 566.6440000000002, 449.98199999999997, 858.2990000000009, 683.3059999999987, 1091.6229999999996, 1641.6010000000006, 974.9609999999993, 633.3079999999991, 824.9670000000006, 566.6440000000002, 1299.9480000000003, 533.3119999999999, 483.3140000000003, 1024.958999999999, 908.2970000000005, 1324.9470000000001, 808.3010000000013, 499.97999999999956, 724.9709999999995, 558.3109999999997, 1183.286, 824.9669999999987, 716.637999999999, 958.2950000000001, 533.3119999999999, 1333.2800000000007, 883.2980000000007, 1099.9560000000001, 991.6270000000004, 924.9629999999997, 1208.2849999999999, 716.637999999999, 899.9639999999999, 708.3050000000003, 1116.6220000000012, 1524.9390000000003, 474.98099999999977, 899.9639999999999, 1008.2929999999997, 941.6290000000008, 749.9699999999993, 858.2990000000009, 866.6319999999996, 1304.6419999999998, 529.6729999999989, 954.6560000000009, 563.005000000001, 1421.304, 896.3250000000007, 1612.9629999999997, 741.6369999999988, 1091.6229999999996, 699.9719999999979, 641.6409999999996, 649.9739999999983, 916.6299999999992, 1808.2610000000004, 1024.9590000000007, 808.3009999999995, 574.976999999999, 749.9699999999975, 716.637999999999, 1558.2710000000006, 1083.2900000000009, 708.3050000000003, 891.6310000000012, 1249.9500000000007, 891.6310000000012, 2066.5840000000026, 1083.2900000000009, 949.9619999999995, 449.98199999999997, 716.637999999999, 858.2989999999991, 1249.9500000000007, 916.630000000001, 466.64800000000105, 983.2940000000017, 1158.2870000000003, 499.97999999999956, 749.9700000000012, 1016.6260000000002, 1341.6129999999976, 774.969000000001, 999.9600000000028, 2041.5849999999991, 849.9660000000003, 1149.953999999998, 566.6440000000002, 858.2989999999991, 791.635000000002, 858.2989999999991, 783.3019999999997, 758.3029999999999, 874.9650000000001, 2083.25, 674.9730000000018, 1058.2909999999974, 1333.2800000000025, 916.6299999999974, 1191.6189999999988, 799.9679999999971, 749.9700000000012, 549.9779999999992, 849.9660000000003, 1066.6239999999998, 1524.9390000000021, 858.2989999999991, 866.6319999999978, 558.3109999999979, 1616.6020000000026, 1049.9579999999987, 983.293999999998, 766.6359999999986, 933.2960000000021, 766.6360000000022, 1733.2639999999992, 1008.2930000000015, 933.2960000000021, 1108.288999999997, 833.2999999999993, 833.2999999999993, 691.6390000000029, 1433.275999999998, 633.3080000000009, 799.9680000000008, 1499.9399999999987, 1316.6140000000014, 916.630000000001, 524.9789999999994, 824.9670000000006, 1316.6139999999978, 958.2949999999983, 916.630000000001, 891.6310000000012, 1233.2839999999997, 599.9759999999987, 908.2969999999987, 1466.6080000000002, 874.9650000000001, 1349.946, 891.6310000000012, 1233.2839999999997, 924.9630000000034, 908.2969999999987, 499.97999999999956, 949.9620000000032, 966.6280000000006, 908.2969999999987, 1333.2799999999988, 691.6389999999992, 974.9609999999993, 816.6339999999982, 1016.6260000000002, 624.9750000000022, 1058.291000000001, 874.9650000000001, 1224.951000000001, 949.9619999999995, 708.3050000000003, 724.9709999999977, 1199.9519999999975, 749.9700000000012, 749.9699999999975, 566.6440000000002, 1166.6200000000026, 1058.291000000001, 916.6299999999974, 866.6320000000014, 874.9650000000001, 816.6340000000018, 1616.6020000000026, 766.6360000000022, 649.974000000002, 1183.2860000000037, 808.3009999999995, 1508.273000000001, 1041.625, 999.9600000000028, 908.2970000000023, 558.3109999999942, 1916.5900000000001, 808.3009999999995, 724.9709999999977, 1274.9490000000005, 824.9670000000042, 641.6410000000033, 1483.2739999999976, 841.6330000000016, 966.627999999997, 841.6329999999944, 458.3150000000023, 991.6270000000004, 524.9789999999994, 646.1920000000027, 1179.5040000000008, 971.1789999999964, 896.1820000000007, 921.1810000000041, 862.8499999999985, 816.6339999999982, 699.9720000000016, 691.6390000000029, 1108.2890000000043, 708.3050000000003, 924.9629999999961, 641.6410000000033, 466.64800000000105, 941.6289999999935, 899.9639999999999, 1724.9310000000041, 791.635000000002, 983.2939999999944, 908.2969999999987, 866.6319999999978, 824.9669999999969, 741.6369999999952, 1183.286, 999.9599999999991, 1158.287000000004, 1166.6200000000026, 1066.6239999999962, 883.2979999999952, 883.2980000000025, 1491.6069999999963, 566.6440000000002, 974.961000000003, 1183.286, 708.3050000000003, 1366.612000000001, 916.6299999999974, 641.6410000000033, 933.2959999999948, 1658.2669999999998, 1091.6229999999996, 733.3040000000037, 524.9789999999994, 949.9619999999995, 1949.9219999999987, 766.6360000000059, 716.637999999999, 824.9670000000042, 1633.2680000000037, 849.9660000000003, 1008.2929999999978, 958.2949999999983, 708.3050000000003, 949.9619999999995, 591.6429999999964, 908.2969999999987, 1166.6200000000026, 649.974000000002, 908.2969999999987, 658.3070000000007, 1324.9470000000001, 1324.9470000000001, 999.9599999999991, 741.6370000000024, 899.9639999999999, 541.6449999999968, 1033.2920000000013, 499.9799999999959, 858.2989999999991, 816.6339999999982, 1316.6139999999941, 824.9669999999969, 1399.9440000000031, 733.3040000000037, 699.9720000000016, 883.2980000000025, 683.3059999999969, 608.3090000000011, 883.2979999999952, 508.3130000000019, 941.6290000000008, 749.9699999999939, 1041.625, 1741.5970000000016, 708.3050000000003, 816.6340000000055, 749.9700000000012, 833.2999999999956, 1008.2929999999978, 683.3060000000041, 1324.9470000000001, 983.2940000000017, 758.3029999999999, 1541.6050000000032, 766.6359999999986, 741.6370000000024, 474.98099999999977, 1141.6209999999992, 1516.6059999999998, 574.976999999999, 916.6299999999974, 924.9630000000034, 974.9609999999957, 874.9650000000038, 1724.9309999999969, 791.635000000002, 849.9660000000003, 1274.9490000000005, 908.2969999999987, 1433.275999999998, 1041.625, 616.6419999999998, 1174.9530000000013, 883.2980000000025, 1274.9490000000005, 908.2969999999987, 574.9770000000062, 549.9780000000028, 1041.625, 1041.625, 899.9639999999999, 1749.9300000000003, 833.3000000000029, 1224.951000000001, 616.6419999999998, 924.9630000000034, 899.9639999999999, 591.6429999999964, 799.9680000000008, 974.961000000003, 1674.9329999999973, 2349.9060000000027, 566.6440000000002, 1458.2750000000015, 958.2949999999983, 1199.9519999999975, 849.9660000000003, 833.3000000000029, 816.6339999999982, 824.9670000000042, 716.637999999999, 874.9650000000038, 749.9700000000012, 1608.2690000000002, 908.2969999999987, 1024.9590000000026, 991.6270000000004, 983.2940000000017, 849.9660000000003, 850.6949999999997, 2367.3009999999995, 1150.6829999999973, 1142.3500000000058, 1092.351999999999, 766.6359999999986, 1067.3530000000028, 1058.2910000000047, 1334.0089999999982, 866.6319999999978, 499.9800000000032, 791.6349999999948, 1599.9360000000015, 1066.6240000000034, 891.6310000000012, 1016.6259999999966, 766.6360000000059, 2016.586000000003, 974.9609999999957, 983.2940000000017, 1541.604999999996, 883.2980000000025, 499.9800000000032, 1183.286, 708.3050000000003, 1133.2880000000005, 908.2969999999987, 666.6399999999994, 816.6339999999982, 474.98099999999977, 799.9680000000008, 999.9600000000064, 791.6349999999948, 1324.9470000000001, 883.2980000000025, 1333.2799999999988, 741.6369999999952, 1033.2920000000013, 816.6340000000055, 1524.9390000000058],
            "type": "histogram",
            marker: {
                color: colors.lc,
            }
        }
    ]
    let pewmaLayout = {
        xaxis: {
            title: "Response time (ms)",
        },
        yaxis: {
            title: "Number of requests",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };

    Plotly.newPlot('pewma-histogram', pewmaData, pewmaLayout, { staticPlot: true });

    let pewmaGraphData = [
        {
            name: 'Least Connections (LC) 50%ile',
            type: 'scatter',
            y: [949.962, 858.299, 808.3009999999999, 799.968, 858.299, 849.9659999999999, 866.6320000000001, 849.9659999999999, 841.6329999999998, 841.6329999999998, 841.6329999999998, 841.6329999999998, 841.6329999999998, 858.2990000000009, 858.2990000000009, 858.2990000000009, 858.2990000000009, 870.7984999999999, 870.7984999999999, 874.9650000000001, 866.6319999999996, 870.7984999999999, 870.7984999999999, 866.6319999999996, 874.9650000000001, 874.9650000000001, 883.2980000000007, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.9960000000001, 891.8135000000007, 891.9960000000001, 896.1820000000007, 891.9960000000001, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 891.6310000000012, 894.0890000000004, 896.1820000000007, 891.6310000000012, 894.0890000000004, 899.9639999999999, 896.3250000000007, 899.9639999999999, 898.1445000000003, 898.1445000000003],
            marker: {
                color: colors.lc,
            },
        },
        {
            name: 'Least Connections (LC) 95%ile',
            type: 'scatter',
            y: [949.962, 1374.1116999999995, 1556.6043999999997, 1904.9237999999993, 1829.9267999999993, 1907.7339499999998, 1837.7002499999999, 1737.5582499999982, 1646.6190499999996, 1646.6008000000002, 1643.2676000000004, 1635.8044, 1612.6180000000004, 1589.4316, 1568.9610000000002, 1592.4334000000001, 1614.3948999999998, 1631.5776999999998, 1620.1225, 1610.0302, 1627.2820000000002, 1642.8509500000005, 1634.4415000000004, 1626.6016000000018, 1641.6010000000006, 1631.6014000000014, 1624.1017000000015, 1616.0561500000022, 1614.7825000000012, 1613.3269, 1605.6309999999999, 1614.600550000001, 1613.1449499999999, 1615.3283500000016, 1613.8727500000005, 1610.0301999999992, 1614.7825000000012, 1613.50885, 1607.0974, 1614.4186000000009, 1616.6020000000026, 1616.6020000000026, 1616.6020000000026, 1616.238100000002, 1614.7825000000012, 1616.6020000000026, 1616.0561500000022, 1614.4186000000009, 1616.6020000000026, 1615.3283500000016, 1614.4186000000009, 1616.6020000000026, 1624.9350000000031, 1619.9352000000026, 1630.768100000003, 1624.9350000000031, 1618.268600000002, 1626.6016000000027, 1622.4351000000024, 1616.6020000000026],
            marker: {
                color: colors.lc,
            },
        },
        {
            name: 'Least Connections (LC) 99%ile',
            type: 'scatter',
            y: [949.962, 1488.1071399999996, 1631.2680799999998, 2026.9189199999996, 2021.9191199999996, 2012.91948, 2004.9197999999997, 1996.9201199999998, 1988.9204399999999, 1981.9207199999992, 1973.9210399999995, 1967.9212799999991, 1959.9215999999992, 1951.9219199999995, 1947.4403500000003, 1942.97338, 1940.4917300000002, 2022.9190800000001, 2014.9194000000002, 2007.919680000001, 2045.7514999999994, 2057.084380000001, 2055.7511000000004, 2054.5844800000004, 2053.2512, 2051.91792, 2050.9179599999998, 2049.6680099999994, 2049.0846999999994, 2048.4180599999995, 2047.8347499999995, 2047.3347699999995, 2046.668129999999, 2046.0014899999994, 2045.3348499999993, 2044.7515399999993, 2044.0848999999994, 2043.5015899999994, 2042.9182799999994, 2042.251639999999, 2040.6683699999999, 2034.2519600000005, 2028.7521800000006, 2021.4191399999968, 2014.0860999999982, 2005.8364300000007, 2002.169909999999, 1993.9202400000013, 1988.4204600000012, 1980.1707899999983, 1975.587639999997, 1969.1712299999979, 2042.4182999999994, 2041.9183199999993, 2049.6680099999994, 2049.0846999999994, 2048.4180599999995, 2047.5847599999993, 2047.1681099999996, 2046.5014699999992],
            marker: {
                color: colors.lc,
            },
        },
        {
            name: 'PEWMA 50%ile',
            type: 'scatter',
            y: [708, 708.3050000000001, 783.3020000000001, 770.8025, 766.6359999999995, 770.8025, 783.3019999999997, 799.9679999999994, 816.634, 816.634, 816.634, 799.9679999999998, 824.9669999999987, 824.9669999999987, 824.9670000000001, 829.1334999999999, 837.4664999999995, 824.9670000000006, 824.9670000000006, 829.1334999999999, 837.4664999999995, 849.9660000000003, 849.9659999999985, 849.9659999999967, 841.6330000000016, 841.6330000000016, 841.6329999999998, 833.2999999999993, 824.9670000000006, 833.2999999999993, 824.9670000000006, 829.1334999999999, 837.4664999999995, 841.6329999999998, 841.6330000000016, 845.7994999999992, 841.6330000000007, 849.9659999999967, 858.2989999999991, 849.9660000000003, 858.2989999999991, 858.2989999999991, 858.2990000000009, 858.2990000000009, 858.2990000000009, 858.2990000000009, 858.2989999999991, 858.2989999999991, 858.2989999999991, 858.2989999999991, 858.2990000000009, 858.2990000000009, 858.2989999999991, 858.2989999999991, 858.2989999999991, 858.2989999999991, 858.2989999999991, 858.2990000000009, 858.2990000000009, 858.2990000000009],
            marker: {
                color: colors.pewma,
            },
        },
        {
            name: 'PEWMA 95%ile',
            type: 'scatter',
            y: [1621, 1621.6017999999997, 1452.0252499999997, 1616.185349999999, 1518.272599999999, 1342.0296499999993, 1271.6157999999996, 1278.6988499999998, 1283.2819999999997, 1375.3616499999991, 1318.6972499999997, 1282.4486999999997, 1279.1154999999997, 1347.0294499999995, 1323.2804000000006, 1300.7812999999996, 1293.698249999998, 1301.6145999999985, 1313.280799999999, 1305.7810999999988, 1300.7812999999983, 1310.780899999999, 1304.1144999999988, 1318.2805999999998, 1308.280999999999, 1323.2803999999999, 1313.280799999999, 1305.7810999999988, 1299.9479999999985, 1294.1148999999978, 1291.614999999998, 1297.4480999999982, 1292.4482999999977, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1293.2815999999975, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1289.5317499999983, 1291.614999999998, 1291.614999999998, 1291.6150000000011, 1291.614999999999, 1291.615000000003, 1291.6150000000002, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.614999999998, 1291.6149999999998, 1291.6150000000036],
            marker: {
                color: colors.pewma,
            },
        },
        {
            name: 'PEWMA 99%ile',
            type: 'scatter',
            y: [1890, 1890.9243599999998, 1857.0090499999994, 1893.0909399999998, 1878.9248399999997, 1853.4258600000007, 1833.5933200000006, 1813.7607800000005, 1823.2603999999997, 1807.5110299999997, 1789.5117500000001, 1773.7623799999985, 1755.7630999999988, 1740.0137300000004, 1730.9307599999997, 1725.6809700000003, 1722.1811100000002, 1716.93132, 1739.00352, 1738.37576, 1737.83768, 1737.03056, 1736.4028, 1735.77504, 1735.0576, 1734.3401600000002, 1733.62272, 1732.26404, 1729.9308000000003, 1727.5975599999997, 1724.9310000000003, 1722.26444, 1720.2645199999997, 1717.2646400000008, 1715.2647200000006, 1712.2648400000007, 1710.2649200000005, 1707.2650399999995, 1704.9317999999998, 1702.5985600000001, 1699.9320000000007, 1699.0987000000005, 1697.5987600000008, 1696.26548, 1694.7655400000003, 1693.7655800000002, 1692.2656400000005, 1690.9323599999998, 1689.9323999999997, 1688.7657799999997, 1687.5991599999998, 1685.9325599999993, 1685.09926, 1683.5993199999994, 1682.7660199999996, 1682.4326999999994, 1696.5988000000007, 1695.5988400000006, 1705.3484499999997, 1704.59848],
            marker: {
                color: colors.pewma,
            },
        },
    ];
    let pewmaGraphLayout = {
        xaxis: {
            title: "Time elapsed (seconds)",
        },
        yaxis: {
            title: "Response time (ms)",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };
    Plotly.newPlot('pewma-graph', pewmaGraphData, pewmaGraphLayout, { staticPlot: true });

    let pewmaDroppedData = [
        {
            name: 'Round Robin (RR)',
            type: 'scatter',
            y: [0, 0, 0, 0, 1, 2, 3, 3, 5, 7, 8, 9, 10, 13, 14, 16, 18, 20, 23, 24, 26, 27, 29, 31, 31, 34, 34, 36, 37, 39, 40, 41, 42, 44, 46, 47, 48, 49, 51, 52, 54, 55, 55, 56, 58, 59, 61, 62, 63, 65, 68, 70, 71, 72, 75, 75, 76, 78, 79, 80],
            marker: {
                color: colors.rr,
            },
        },
        {
            name: 'Weighted Round Robin (WRR)',
            type: 'scatter',
            y: [0, 0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8, 8, 8, 8, 10, 10, 11, 12, 14, 14, 16, 16, 17, 17, 17, 17, 17, 19, 20, 20, 21, 22, 23, 23, 23, 24, 25, 26, 26, 27, 28, 29, 31, 31, 31, 32, 32, 32, 33, 33, 34, 35, 35, 35, 35, 35],
            marker: {
                color: colors.wrr,
            },
        },
        {
            name: 'Least Connections (LC)',
            type: 'scatter',
            y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12],
            marker: {
                color: colors.lc,
            },
        },
        {
            name: 'PEWMA',
            type: 'scatter',
            y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 3, 3, 4, 5, 5, 5, 5, 6, 6, 7, 8, 8, 8, 9, 9, 9, 9, 10, 12, 13, 14, 15, 16, 16, 16, 17, 17, 18, 20, 21, 23, 24, 24, 26, 26, 27, 27, 27, 28],
            marker: {
                color: colors.pewma,
            },
        },
    ];
    let pewmaDroppedLayout = {
        xaxis: {
            title: "Time elapsed (seconds)",
        },
        yaxis: {
            title: "Dropped requests (cumulative)",
        },
        margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 20,
        },
        legend: {
            bgcolor: "rgba(255,255,255,0.6)",
            xanchor: "right",
        }
    };
    Plotly.newPlot('pewma-dropped', pewmaDroppedData, pewmaDroppedLayout, { staticPlot: true });

    new Simulation({
        element: document.getElementById("fin"),
        numServers: 6,
        serverPower: { min: 1, max: 1 },
        serverPowerMax: 10,
        rps: 4,
        requestCost: { min: 100, max: 100 },
        requestCostMax: 300,
        queueMaxLength: 3,
        algorithm: "least-connections",
        showAlgorithmSelector: true,
        showNumServersSlider: true,
        showRequestVarianceSlider: true,
        showRpsSlider: true,
        showRpsVarianceSlider: true,
        showServerPowerSlider: true,
    });

});

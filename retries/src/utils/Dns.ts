import { Graphics } from "pixi.js-legacy";
import Handler from "./Handler";

class DNS {
  hosts: { [key: string]: (Handler & Graphics)[] } = {};

  register(url: string, targets: (Handler & Graphics)[]) {
    this.hosts[url] = targets;
  }

  add(url: string, target: Handler & Graphics) {
    if (!this.hosts[url]) {
      this.hosts[url] = [];
    }
    this.hosts[url].push(target);
  }

  resolve(url: string): (Handler & Graphics)[] | null {
    return this.hosts[url];
  }
}

export default DNS;

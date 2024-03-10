// Taken from https://github.com/colin-scott/interactive_latencies/blob/master/interactive_latency.html

function shift(year: number) {
  return year - 1982;
}
function getPayloadBytes() {
  // 1 MB
  return Math.pow(10, 6);
}
function getNetworkPayloadBytes() {
  // 2KB
  return 2 * Math.pow(10, 3);
}
function getCycle(year: number) {
  // Clock speed stopped at ~3GHz in ~2005
  // [source: http://www.kmeme.com/2010/09/clock-speed-wall.html]
  // Before then, doubling every ~2 years
  // [source: www.cs.berkeley.edu/~pattrsn/talks/sigmod98-keynote.ppt]
  if (year <= 2005) {
    // 3*10^9 = a*b^(2005-1990)
    // b = 2^(1/2)
    // -> a = 3*10^9 / 2^(2005.5)
    var a = (3 * Math.pow(10, 9)) / Math.pow(2, shift(2005) * 0.5);
    var b = Math.pow(2, 1.0 / 2);
    var hz = a * Math.pow(b, shift(year));
  } else {
    var hz = 3 * Math.pow(10, 9);
  }
  //  1 / HZ = seconds
  //  1*10^9 / HZ = ns
  var ns = Math.pow(10, 9) / hz;
  return ns;
}
function getMemLatency(year: number) {
  // Bus Latency is actually getting worse:
  // [source: http://download.micron.com/pdf/presentations/events/winhec_klein.pdf]
  // 15 years ago, it was decreasing 7% / year
  // [source: www.cs.berkeley.edu/~pattrsn/talks/sigmod98-keynote.ppt]
  if (year <= 2000) {
    // b = 0.93
    // 100ns = a*0.93^2000
    /// -> a = 100 / 0.93^2000
    var b = 0.93;
    var a = 100.0 / Math.pow(0.93, shift(2000));
    var ms = a * Math.pow(b, shift(year));
  } else {
    var ms = 100; // ns
  }
  return ms;
}
function getNICTransmissionDelay(payloadBytes: number, year: number) {
  // NIC bandwidth doubles every 2 years
  // [source: http://ampcamp.berkeley.edu/wp-content/uploads/2012/06/Ion-stoica-amp-camp-21012-warehouse-scale-computing-intro-final.pdf]
  // TODO: should really be a step function
  // 1Gb/s = 125MB/s = 125*10^6 B/s in 2003
  // 125*10^6 = a*b^x
  // b = 2^(1/2)
  // -> a = 125*10^6 / 2^(2003.5)
  var a = (125 * Math.pow(10, 6)) / Math.pow(2, shift(2003) * 0.5);
  var b = Math.pow(2, 1.0 / 2);
  var bw = a * Math.pow(b, shift(year));
  // B/s * s/ns = B/ns
  var ns = payloadBytes / (bw / Math.pow(10, 9));
  return ns;
}
function getBusTransmissionDelay(payloadBytes: number, year: number) {
  // DRAM bandwidth doubles every 3 years
  // [source: http://ampcamp.berkeley.edu/wp-content/uploads/2012/06/Ion-stoica-amp-camp-21012-warehouse-scale-computing-intro-final.pdf]
  // 1MB / 250,000 ns = 10^6B / 0.00025 = 4*10^9 B/s in 2001
  // 4*10^9 = a*b^x
  // b = 2^(1/3)
  // -> a = 4*10^9 / 2^(2001.33)
  var a = (4 * Math.pow(10, 9)) / Math.pow(2, shift(2001) * 0.33);
  var b = Math.pow(2, 1.0 / 3);
  var bw = a * Math.pow(b, shift(year));
  // B/s * s/ns = B/ns
  var ns = payloadBytes / (bw / Math.pow(10, 9));
  return ns;
}
function getSSDLatency(year: number) {
  // Will flat-line in one capacity doubling cycle (18 months=1.5years)
  // Before that, 20X decrease in 3 doubling cycles (54 months=4.5years)
  // Source: figure 4 of http://cseweb.ucsd.edu/users/swanson/papers/FAST2012BleakFlash.pdf
  // 20 us = 2*10^4 ns in 2012
  // b = 1/20 ^ 1/4.5
  // -> a = 2*10^4 / 1/20 ^(2012 * 0.22)
  if (year <= 2014) {
    var a = (2 * Math.pow(10, 4)) / Math.pow(1.0 / 20, shift(year) * 0.22);
    var b = Math.pow(1.0 / 20, 1.0 / 4.5);
    return a * Math.pow(b, shift(year));
  } else {
    return 16000;
  }
}
function getSSDTransmissionDelay(payloadBytes: number, year: number) {
  // SSD bandwidth doubles every 3 years
  // [source: http://ampcamp.berkeley.edu/wp-content/uploads/2012/06/Ion-stoica-amp-camp-21012-warehouse-scale-computing-intro-final.pdf]
  // 3GB/s = a*b^2012
  // b = 2^(1/3)
  // -> a = 6*10^9 / 2^(2012.33)
  var a = (3 * Math.pow(10, 9)) / Math.pow(2, shift(2012) * 0.33);
  var b = Math.pow(2, 1.0 / 3);
  var bw = a * Math.pow(b, shift(year));
  // B/s * s/ns = B/ns
  var ns = payloadBytes / (bw / Math.pow(10, 9));
  return ns;
}
function getSeek(year: number) {
  // Seek + rotational delay halves every 10 years
  // [source: http://www.storagenewsletter.com/news/disk/hdd-technology-trends-ibm]
  // In 2000, seek + rotational =~ 10 ms
  // b = (1/2)^(1/10)
  // -> a = 10^7 / (1/2)^(2000*0.1)
  var a = Math.pow(10, 7) / Math.pow(0.5, shift(2000) * 0.1);
  var b = Math.pow(0.5, 0.1);
  var ns = a * Math.pow(b, shift(year));
  return ns;
}
function getDiskTransmissionDelay(payloadBytes: number, year: number) {
  // Disk bandwidth is increasing very slowly -- doubles every ~5 years
  // [source: http://ampcamp.berkeley.edu/wp-content/uploads/2012/06/Ion-stoica-amp-camp-21012-warehouse-scale-computing-intro-final.pdf]
  // Before 2002 (~100MB/s):
  // Disk bandwidth doubled every two years
  // [source: www.cs.berkeley.edu/~pattrsn/talks/sigmod98-keynote.ppt]
  if (year <= 2002) {
    // 100MB/s = a*b^2002
    // b = 2^(1/2)
    // -> a = 10^8 / 2^(2002.5)
    var a = Math.pow(10, 8) / Math.pow(2, shift(2002) * 0.5);
    var b = Math.pow(2, 1.0 / 2);
    var bw = a * Math.pow(b, shift(year));
  } else {
    // 100MB/s = a*b^2002
    // b = 2^(1/5)
    // -> a = 10^8 / 2^(2002-1982 * .2)
    var a = Math.pow(10, 8) / Math.pow(2, shift(2002) * 0.2);
    var b = Math.pow(2, 1.0 / 5);
    var bw = a * Math.pow(b, shift(year));
  }
  // B/s * s/ns = B/ns
  var ns = payloadBytes / (bw / Math.pow(10, 9));
  return ns;
}
function getDCRTT() {
  // Assume this doesn't change much?
  return 500000; // ns
}
function getWanRTT() {
  // Routes are arguably improving:
  //   http://research.google.com/pubs/pub35590.html
  // Speed of light is ultimately fundamental
  return 150000000; // ns
}

export function statsForYear(year: number) {
  return {
    L1: 3 * getCycle(year),
    branch: 10 * getCycle(year),
    L2: 13 * getCycle(year),
    mutex: 50 * getCycle(year),
    mem: getMemLatency(year),
    snappy: 6000 * getCycle(year),
    network: getNICTransmissionDelay(getNetworkPayloadBytes(), year),
    ssdRandom: getSSDLatency(year),
    mbMem: getBusTransmissionDelay(getPayloadBytes(), year),
    rtt: getDCRTT(),
    mbSSD: getSSDTransmissionDelay(getPayloadBytes(), year),
    seek: getSeek(year),
    mbDisk: getDiskTransmissionDelay(getPayloadBytes(), year),
    wan: getWanRTT(),
  };
}

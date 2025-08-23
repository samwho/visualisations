self.onmessage = async function (event) {
  const { code, id } = event.data;

  try {
    const userFunction = new Function(code);
    self.postMessage({ type: "onStart", id });

    const startTime = performance.now();
    const result = userFunction();

    // Await the result if it's a Promise, otherwise it resolves immediately
    await result;

    const endTime = performance.now();
    self.postMessage({
      type: "onComplete",
      id,
      executionTime: endTime - startTime,
    });
  } catch (error) {
    self.postMessage({
      type: "onError",
      id,
      error: (error as Error).message || "Unknown error",
    });
  }
};

// Export empty object to make this a module
export {};

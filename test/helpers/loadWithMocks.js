const path = require('node:path');

const loadWithMocks = (moduleUnderTest, mocks = {}) => {
  const resolvedModule = require.resolve(moduleUnderTest);
  const moduleDirectory = path.dirname(resolvedModule);
  const previousModuleEntry = require.cache[resolvedModule];
  const previousDependencies = new Map();

  for (const [request, mockExports] of Object.entries(mocks)) {
    const resolvedDependency = require.resolve(request, {
      paths: [moduleDirectory],
    });

    previousDependencies.set(
      resolvedDependency,
      require.cache[resolvedDependency]
    );

    require.cache[resolvedDependency] = {
      id: resolvedDependency,
      filename: resolvedDependency,
      loaded: true,
      exports: mockExports,
    };
  }

  delete require.cache[resolvedModule];

  const loadedModule = require(resolvedModule);

  const restore = () => {
    delete require.cache[resolvedModule];

    if (previousModuleEntry) {
      require.cache[resolvedModule] = previousModuleEntry;
    }

    for (const [resolvedDependency, previousEntry] of previousDependencies) {
      if (previousEntry) {
        require.cache[resolvedDependency] = previousEntry;
      } else {
        delete require.cache[resolvedDependency];
      }
    }
  };

  return {
    loadedModule,
    restore,
  };
};

module.exports = {
  loadWithMocks,
};

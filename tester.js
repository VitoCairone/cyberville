// Collects the names of all global functions currently defined
function collectBackgroundFns() {
    const globalScope = typeof window !== 'undefined' ? window : global;
    return Object.keys(globalScope).filter(key => typeof globalScope[key] === 'function');
}

// Main function to run tests and show coverage
function runTestsAndShowCoverage(scope = null, excludeFns = []) {
    const useScope = scope || (typeof window !== 'undefined' ? window : global);
    const allFunctions = Object.keys(useScope).filter(key => typeof useScope[key] === 'function');
    
    // Exclude functions in excludeFns
    if (!scope) allFunctions = allFunctions.filter(name => !excludeFns.includes(name));
    
    // Separate test functions and non-test functions
    const testFunctions = allFunctions.filter(name => /^test/.test(name));
    const nonTestFunctions = allFunctions.filter(name => !/^test/.test(name));
    
    // 2. Print names of all non-test functions
    console.log("Functions (excluding those starting with 'test'):");
    nonTestFunctions.forEach(name => console.log(`- ${name}`));
    
    // 3. Run all test functions
    console.log("\nRunning test functions:");
    testFunctions.forEach(testName => {
        try {
            console.log(`- Running ${testName}...`);
            useScope[testName](); // Call the test function
            console.log(`  ${testName} passed.`);
        } catch (error) {
            console.error(`  ${testName} failed: ${error}`);
        }
    });
    
    // 4. Identify functions without matching test functions
    console.log("\nFunctions with no matching test functions:");
    const testFunctionNames = new Set(testFunctions.map(name => name.slice(4))); // strip "test"
    nonTestFunctions.forEach(name => {
        if (!testFunctionNames.has(name)) {
            console.log(`- ${name}`);
        }
    });
}

// this has to run before any file containing code to test is parsed
const backgroundFns = collectBackgroundFns();
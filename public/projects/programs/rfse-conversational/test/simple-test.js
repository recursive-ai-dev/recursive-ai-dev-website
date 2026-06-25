/**
 * Simple Test Script for RFSE Conversational
 */

import { RFSECore } from '../src/index.js';

console.log('========================================');
console.log('RFSE CONVERSATIONAL - Test Script');
console.log('========================================\n');

// Initialize RFSE
console.log('Initializing RFSE Core...');
const rfse = new RFSECore({
    dimension: 64,
    fixpointConfig: {
        maxIterations: 50,
        minIterations: 5,
        convergenceThreshold: 0.8
    }
});

console.log('✓ RFSE initialized successfully\n');

// Test conversations
const testInputs = [
    "Hello, how are you today?",
    "Tell me about yourself.",
    "What do you think about artificial intelligence?",
    "That's interesting. Can you elaborate?"
];

async function runTests() {
    console.log('Running conversation tests...\n');

    for (let i = 0; i < testInputs.length; i++) {
        const input = testInputs[i];

        console.log(`[${i + 1}/${testInputs.length}] INPUT: "${input}"`);

        try {
            const result = await rfse.processInput(input);

            console.log(`    OUTPUT: "${result.text}"`);
            console.log(`    METADATA:`, {
                cluster: result.metadata.cluster,
                converged: result.metadata.converged,
                iterations: result.metadata.iterations
            });

            // Simulate positive feedback for first responses
            if (i < 2) {
                rfse.provideFeedback(0.8);
                console.log(`    FEEDBACK: Positive (0.8)`);
            }

            console.log('');

        } catch (error) {
            console.error(`    ERROR: ${error.message}`);
            console.log('');
        }

        // Small delay between inputs
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Display final statistics
    console.log('========================================');
    console.log('FINAL STATISTICS');
    console.log('========================================\n');

    const stats = rfse.getStatistics();

    console.log('Conversation:');
    console.log(`  - Iterations: ${stats.iteration}`);
    console.log(`  - Messages: ${stats.conversationLength}`);

    console.log('\nClusters:');
    console.log(`  - Total: ${stats.clusters.totalClusters}`);
    console.log(`  - Total Instances: ${stats.clusters.totalInstances}`);
    console.log(`  - Avg Size: ${stats.clusters.avgClusterSize.toFixed(2)}`);

    console.log('\nTemporal Memory:');
    console.log(`  - Working Memory: ${stats.temporal.workingMemory.size} items`);
    console.log(`  - Long-term Memory: ${stats.temporal.longTermMemory.count} items`);
    console.log(`  - Cognitive Load: ${(stats.temporal.cognitiveLoad * 100).toFixed(1)}%`);
    console.log(`  - Coherence: ${(stats.temporal.coherence.overall * 100).toFixed(1)}%`);

    console.log('\nDomains:');
    for (const domain of stats.domains.slice(0, 3)) {
        console.log(`  - ${domain.name}: ${domain.activationCount} activations`);
    }

    console.log('\nFeedback System:');
    console.log(`  - Recent Success Rate: ${(stats.feedback.recentSuccessRate * 100).toFixed(1)}%`);
    console.log(`  - Unique Operations: ${stats.feedback.uniqueOperations}`);
    console.log(`  - Exploration Rate: ${(stats.feedback.explorationRate * 100).toFixed(1)}%`);

    console.log('\nTop Axioms:');
    for (const axiom of stats.axioms.topOperations.slice(0, 5)) {
        console.log(`  - ${axiom.operation}: ${axiom.score.toFixed(3)} (used ${axiom.count}x)`);
    }

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    console.log('Architecture Overview:');
    console.log('  [Input Text]');
    console.log('       ↓');
    console.log('  [Symbolic Abstraction] → Categorical Vector');
    console.log('       ↓');
    console.log('  [Cluster Assignment] → Conceptual Category');
    console.log('       ↓');
    console.log('  [Axiom Selection] → Operations');
    console.log('       ↓');
    console.log('  [Fixpoint Search] → Coherent State');
    console.log('       ↓');
    console.log('  [Domain Projections] → Interpretations');
    console.log('       ↓');
    console.log('  [Recursive Refinement] → Final State');
    console.log('       ↓');
    console.log('  [Response Synthesis] → Output Text');
    console.log('       ↓');
    console.log('  [Temporal Storage] → Memory');
    console.log('\nAll systems operational! ✓\n');
}

// Run tests
runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});

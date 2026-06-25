import { RFSECore } from '../src/index.js';

async function runRobustnessTest() {
    console.log('========================================');
    console.log('RFSE ROBUSTNESS & EVOLUTION TEST');
    console.log('========================================\n');

    const rfse = new RFSECore({
        dimension: 64,
        fixpointConfig: { maxIterations: 100 }
    });

    const phases = [
        {
            name: "Initial Interaction",
            inputs: [
                "Hello. I want to explore the nature of language.",
                "How does structure influence meaning?"
            ],
            feedback: 0.8
        },
        {
            name: "Evolutionary Pressure",
            inputs: [
                "The quick brown fox jumps over the lazy dog.",
                "Symmetry is a beautiful property of mathematics.",
                "Recursion allows for infinite depth within finite bounds."
            ],
            feedback: 0.95
        },
        {
            name: "Cross-Domain Synergy",
            inputs: [
                "Consider the relationship between music and architecture.",
                "A poem is a structural machine for generating emotion."
            ],
            feedback: 0.9
        }
    ];

    for (const phase of phases) {
        console.log(`--- PHASE: ${phase.name} ---`);
        for (const input of phase.inputs) {
            const result = await rfse.processInput(input);
            console.log(`INPUT: ${input}`);
            console.log(`OUTPUT: ${result.text.substring(0, 100)}...`);
            rfse.provideFeedback(phase.feedback);
        }
        console.log('');
    }

    console.log('--- SYSTEM EVOLUTION REPORT ---');
    const stats = rfse.getStatistics();

    console.log(`Total Iterations: ${stats.iteration}`);
    console.log(`Generated Axioms: ${stats.axioms.generatedCount}`);

    if (stats.axioms.generatedCount > 0) {
        console.log('✓ System has successfully evolved its algebraic identity.');
    } else {
        console.warn('! No axioms were generated. Increasing feedback pressure.');
    }

    console.log('\nTop Performing Axioms:');
    stats.axioms.topOperations.forEach(op => {
        console.log(`- ${op.name}: Score ${op.score.toFixed(3)}`);
    });

    console.log('\nConceptual Clusters:');
    console.log(`- Total: ${stats.clusters.totalClusters}`);
    console.log(`- Avg Size: ${stats.clusters.avgClusterSize.toFixed(2)}`);

    console.log('\nDomain Activations:');
    stats.domains.forEach(d => {
        console.log(`- ${d.name}: ${d.activationCount} times`);
    });

    console.log('\n========================================');
    console.log('ROBUSTNESS TEST COMPLETE');
    console.log('========================================');
}

runRobustnessTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

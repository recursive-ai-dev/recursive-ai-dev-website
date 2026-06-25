import { RFSECore } from '../src/index.js';

async function testAxiomLearning() {
    console.log('Testing Axiom Learning...');
    const rfse = new RFSECore({ dimension: 32 });

    // 1. Process some input
    await rfse.processInput("This is a test of the learning system.");

    // 2. Provide strong positive feedback
    console.log('Providing positive feedback (0.9)...');
    rfse.provideFeedback(0.9);

    // 3. Check statistics
    const stats = rfse.getStatistics();
    console.log('Generated Axioms Count:', stats.axioms.generatedCount);

    if (stats.axioms.generatedCount > 0) {
        console.log('✓ Axiom learning triggered successfully');
    } else {
        console.log('! No axioms generated yet.');
    }
}

testAxiomLearning().catch(err => {
    console.error(err);
    process.exit(1);
});

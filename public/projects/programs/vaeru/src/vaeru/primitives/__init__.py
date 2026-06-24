"""VAERU primitive implementations.

Each primitive maps to the architecture in docs/ARCHITECTURE.md. The runtime
uses these as small, composable units rather than one monolithic detector.
"""

from .p1_gradient import GradientFollower
from .p2_membrane import MembraneFilter
from .p3_phase import PhaseDetector
from .p4_residue import ResidueAccumulator
from .p5_lattice import LatticeTraverser
from .p6_inverter import SignalInverter
from .p7_pressure import PressureDistributor
from .p8_echo import EchoEncoder
from .p9_coherence import CoherenceArbiter
from .p10_decay import DecayScheduler
from .p11_topology import TopologyMutator
from .p12_tracer import CausalTracer

__all__ = [
    "GradientFollower",
    "MembraneFilter",
    "PhaseDetector",
    "ResidueAccumulator",
    "LatticeTraverser",
    "SignalInverter",
    "PressureDistributor",
    "EchoEncoder",
    "CoherenceArbiter",
    "DecayScheduler",
    "TopologyMutator",
    "CausalTracer",
]

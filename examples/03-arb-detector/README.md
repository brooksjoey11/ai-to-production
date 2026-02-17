# FPGA Arbitrage Detector: AI vs Production

This Verilog module implements a high‑speed arbitrage detector that compares two 64‑bit prices from different exchanges and generates a trade signal when the price difference exceeds a fixed threshold (e.g., 0.02%). It is designed to run directly on FPGA fabric at 1 GHz (1 ns cycle time) using a three‑stage pipeline.

## The AI Version

The AI‑generated code (`ai-version.v`) looks correct at first glance: it latches inputs, computes an absolute difference, compares against a threshold, and outputs a packed signal. However, it suffers from several critical flaws that would make it unusable in production:

- **No reset** – Registers power up to random values, causing garbage outputs and false trade signals immediately after FPGA configuration.
- **Stale data handling** – If only one price valid flag is high, the module uses the old value of the other price, leading to incorrect comparisons.
- **Truncation** – Only the lower 32 bits of each 64‑bit price are output; the high‑precision data is lost.
- **Hardcoded threshold** – The 0.02% threshold is fixed in the code and cannot be adjusted without re‑synthesis.
- **Ambiguous fixed‑point format** – The comment says “0.02% in fixed‑point” but does not define the scaling (number of fractional bits), inviting misinterpretation.
- **No input synchronisation** – Assumes all inputs are synchronous to the same clock; crossing clock domains would cause metastability.

## The Production Version

The corrected version (`arb-detector.v`) addresses every issue identified in the forensic dossier:

- **Synchronous reset** (`rst`) added – initialises all registers to zero on power‑up or when asserted.
- **Both‑valid latching** – Prices are updated only when *both* `price_a_valid` and `price_b_valid` are high, eliminating stale‑data comparisons.
- **Full 64‑bit output** – `trade_signal` widened to 128 bits, concatenating the full `price_a` and `price_b`. (If a 64‑bit output is mandatory, two separate 64‑bit ports can be added instead.)
- **Parameterised threshold** – `THRESHOLD` is now a Verilog parameter, allowing compile‑time configuration without modifying the core code.
- **Fixed‑point documentation** – The assumed format (Q32.32) is explained, and an example shows how to compute the threshold value for any desired percentage.
- **Synchronisation note** – A comment advises that if inputs come from asynchronous clock domains, external double‑flop synchronisers must be used.

## The Result

**AI version:** Looks plausible, but would generate false trades at startup, miss opportunities when prices arrive out of sync, and lose precision. It is not safe for deployment.

**Production version:** Correctly implements the intended behaviour with robust initialisation, proper handling of asynchronous price updates, full precision output, and configurable threshold. It is ready for synthesis and integration into a real trading system.

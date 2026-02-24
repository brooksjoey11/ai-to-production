CODE FORENSIC DOSSIER: arb_detector.v

1. EXECUTIVE INTELLIGENCE BRIEF

· Subject Type: Verilog hardware module (FPGA design)
· Analysed State: As of provided code (no version/date)
· Overall Quality Score: 6/10 – Simple, well‑pipelined logic but missing essential features: no reset, hardcoded threshold, output truncation, and no documentation of data formats.
· Primary Purpose (Plain Language): To detect when the price difference between two financial exchanges exceeds a tiny fixed threshold and send a signal to execute a trade.
· Critical Insight: The module works in theory but has no reset, so at power‑on it may issue random trade signals; also it only transmits half of each price, losing precision.
· Biggest Risk: Uninitialised registers cause undefined outputs at startup, potentially triggering false trades immediately after power‑up.

2. COMPONENT AUTOPSY

2.1 arb_detector (lines 1–28)

· Stated Purpose (from name/comments): “Pulse‑optimized arbitrage detector – runs directly on FPGA fabric” at 1 GHz.
· Actual Behavior:
    On each rising clock edge:
  1. Latches price_a into a_reg if price_a_valid is high, otherwise holds previous value.
  2. Similarly latches price_b into b_reg.
  3. Computes absolute difference diff = |a_reg - b_reg| (using the values before the latch update).
  4. If diff > threshold (hardcoded constant), sets trade_valid high and packs the lower 32 bits of a_reg and b_reg into trade_signal; otherwise trade_valid low.
· Completeness (% & Justification): 70%
  · Core comparison logic is present and pipelined correctly.
  · Missing: reset initialisation, configurable threshold, handling of stale inputs, full‑precision output, and any error/edge‑case management.
  · No documentation on fixed‑point format, making the threshold value opaque.
· Inputs:
  · clk (1‑bit) – 1 GHz clock
  · price_a, price_b (64‑bit) – fixed‑point prices from exchanges
  · price_a_valid, price_b_valid (1‑bit) – data valid flags
· Outputs:
  · trade_signal (64‑bit) – concatenation of a_reg[31:0] and b_reg[31:0]
  · trade_valid (1‑bit) – high when a trade opportunity is detected
· Dependencies (calls to other components): None – standalone module.
· Error Handling: None. No checks for missing valid signals, overflow, or invalid conditions.
· Identified Risks:
  · No reset → undefined startup state
  · Stale prices when one valid flag is low
  · Hardcoded threshold → cannot adapt
  · Output truncation loses high‑order bits
  · Undocumented fixed‑point representation
· Hidden Opportunities:
  · Could add a reset input and initialise registers.
  · Could make threshold a parameter or a configurable register.
  · Could output full 64‑bit prices (e.g., as 128‑bit signal) for complete information.

3. DEPENDENCY GRAPH & ENVIRONMENT MAP

```
External inputs:
    [clk] ------------>|
    [price_a] -------->|
    [price_b] -------->|   arb_detector
    [price_a_valid] -->|   (module)
    [price_b_valid] -->|
                        |
Outputs:                |
    [trade_signal] <----|
    [trade_valid]  <----

Internal data flow (pipeline stages):

    Stage 1 (latch):
        a_reg <= (price_a_valid) ? price_a : a_reg
        b_reg <= (price_b_valid) ? price_b : b_reg

    Stage 2 (difference):
        diff <= (a_reg > b_reg) ? (a_reg - b_reg) : (b_reg - a_reg)

    Stage 3 (compare & output):
        if (diff > threshold) begin
            trade_signal <= {a_reg[31:0], b_reg[31:0]};
            trade_valid <= 1'b1;
        end else begin
            trade_valid <= 1'b0;
        end
```

Environmental Preconditions:

· Must be synthesised for an FPGA with a 1 GHz clock (timing closure required).
· Inputs must be synchronous to clk.
· No reset signal – assumes registers power up in a known state (not guaranteed in most FPGAs).
· Fixed‑point format of prices and threshold must be agreed upon externally (not defined in code).

External Dependencies: None.

4. CRITICAL FINDINGS MATRIX

Priority Finding Type Component Description (Plain Language) Operational Impact Recommended Action
P0‑Critical Missing Reset arb_detector No reset signal; registers start with random values at power‑on. System may issue false trade signals immediately after startup, before any valid prices arrive. Add a reset input and initialise all registers (e.g., to zero) on reset assertion.
P1‑High Output Truncation arb_detector Trade signal sends only the lower 32 bits of each 64‑bit price. If prices use the full 64‑bit range, the output loses the high‑order bits, making the signal meaningless for subsequent trading logic. Output full 64‑bit prices, e.g., concatenate into a 128‑bit bus, or use a different packing scheme.
P1‑High Stale Data Risk arb_detector When one price valid flag is low, the module keeps using the old price for comparisons. Can cause false or missed arbitrage opportunities (e.g., trading on outdated prices). Consider only computing the difference when both prices are fresh, or implement a timeout to invalidate stale data.
P2‑Medium Hardcoded Threshold arb_detector The comparison threshold is fixed in the code (0.02% in an unknown fixed‑point format). Cannot adjust the threshold without recompiling the FPGA bitstream; inflexible to changing market conditions. Make threshold a parameter or a runtime‑configurable input register.
P2‑Medium Undocumented Format arb_detector No explanation of the fixed‑point representation used for prices and threshold. Operators may misinterpret the hex value, leading to incorrect threshold settings or price scaling. Add comments defining the fixed‑point format (e.g., Q64, number of fractional bits).

5. BEHAVIORAL TRACE

Step‑by‑step walkthrough of the module’s operation in plain language:

1. Clock Tick – The module is triggered on every rising edge of the 1 GHz clock.
2. Latch Inputs – It checks the two valid flags.
   · If price_a_valid is high, the current price_a is stored in an internal register a_reg.
   · If price_b_valid is high, the current price_b is stored in b_reg.
   · If a valid flag is low, the corresponding register keeps its old value.
3. Compute Difference – Using the values before the latch update (i.e., the prices from the previous cycle), the module calculates the absolute difference:
      diff = |a_reg - b_reg|.
4. Compare to Threshold – It compares diff to a fixed constant threshold (set to 0x51E, which comments say represents 0.02% in an unspecified fixed‑point scale).
5. Generate Output –
   · If diff > threshold, it sets trade_valid high and packs the lower 32 bits of a_reg and b_reg into the 64‑bit trade_signal.
   · Otherwise, trade_valid is set low (the trade_signal retains its previous value, but it is only meaningful when trade_valid is high).
6. End of Cycle – The outputs are available for the next clock edge.

Important Notes:

· The pipeline introduces a latency of two clock cycles: a price latched in cycle N affects the output in cycle N+2.
· Because there is no reset, the initial values of a_reg, b_reg, and diff are undefined. The first few outputs may be random until at least one valid price arrives for each register.
· If one price feed stops sending valid flags, the module continues to use the last known price, leading to potentially incorrect comparisons.

6. ANSWER KEY: SPECIFIC INTELLIGENCE QUERIES

1. What is the primary purpose of this code?
      To detect when the price difference between two exchanges exceeds a small fixed threshold and output a signal to execute a trade.
2. What are the five most important functions/classes and their responsibilities?
      The module is a single entity; its key operations are:
   · Input latching (store prices when valid)
   · Absolute difference calculation
   · Threshold comparison
   · Output generation (packing prices and setting valid flag)
   · Pipeline staging (three‑stage pipeline for high speed)
3. What inputs does the code expect?
   · A 1 GHz clock
   · Two 64‑bit price values (price_a, price_b)
   · Two 1‑bit valid flags (price_a_valid, price_b_valid)
4. What outputs does it produce?
   · A 64‑bit trade_signal containing the lower 32 bits of each price
   · A 1‑bit trade_valid flag indicating a detected opportunity
5. What external dependencies (libraries, services, tools) are required?
      None. It is pure hardware and requires no external software or libraries.
6. What is the overall code quality score (1‑10) based on readability, documentation, structure, and error handling?
      6/10 – The code is short and well‑structured with clear pipelining, but it lacks a reset, has a hardcoded threshold, truncates output, contains no error handling, and has no documentation on the fixed‑point format.
7. What is the single biggest operational risk if this code is used as‑is?
      Random outputs at power‑on due to uninitialised registers, which could trigger false trades immediately after startup.
8. What is the most likely point of failure under normal conditions?
      Stale data when one price feed stops sending valid flags – the module will continue using an old price, leading to incorrect comparisons.
9. What assumptions does the code make about its environment that might not hold?
   · Assumes registers power up in a known state (no reset needed).
   · Assumes the fixed‑point representation is understood by all parties.
   · Assumes the 1 GHz clock is always available and stable.
10. What is the most valuable improvement that would yield the greatest benefit for the least effort?
        Add a reset input and initialise all registers to zero. This eliminates startup uncertainty with minimal change.
11. Are there any hardcoded values that should be configurable?
        Yes – the threshold (64'h000000000000051E). It should be a parameter or an input register.
12. Is there error handling for exceptional conditions?
        No. There is no handling of missing valid flags, overflow, or invalid inputs.
13. Does the code contain any obvious bugs (e.g., division by zero, infinite loop, race condition)?
        No obvious bugs like division by zero, but there are design flaws:
    · No reset → undefined initial state.
    · Output truncation loses high‑order bits.
    · Stale data risk.
14. What is the estimated resource consumption (CPU, memory, disk) for typical use?
        As hardware, it uses a handful of FPGA registers and look‑up tables – negligible. No CPU, memory, or disk usage.
15. If a non‑technical manager asked “Can we trust this code in production?”, what would you answer and why?
        No, because it has no reset, so at power‑up it may issue random trade signals. Additionally, it only sends half of each price, which could cause incorrect trading decisions. It needs a reset and to output full prices before it can be considered reliable.

7. COMPLETE INVENTORY INDEX

· module arb_detector (lines 1‑28) – Complete (but with noted flaws)
· always @(posedge clk) block (lines 10‑28) – Complete
· reg [63:0] a_reg (line 7) – Complete
· reg [63:0] b_reg (line 7) – Complete
· reg [63:0] diff (line 8) – Complete
· reg [63:0] threshold (line 9) – Complete (hardcoded)
· input clk – Complete
· input [63:0] price_a – Complete
· input [63:0] price_b – Complete
· input price_a_valid – Complete
· input price_b_valid – Complete
· output reg [63:0] trade_signal – Complete
· output reg trade_valid – Complete

8. FINAL ASSESSMENT & DIRECTIVE

· Verdict: This code is Near‑Operational – it implements the core comparison logic correctly but has critical flaws that prevent reliable deployment.
· Next Logical Step: The very next action a competent engineer should take is add a reset input and initialise all registers to zero. This immediately removes the startup uncertainty.
· Plain‑Language Summary: This hardware module checks if two prices are far apart and signals a trade. However, it has no reset button, so when first turned on it might give random signals. Also, it only uses half of each price, which could lose important information. To be trustworthy, it needs a reset and to output the full prices.
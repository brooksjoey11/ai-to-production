// Pulse-optimized arbitrage detector - runs directly on FPGA fabric
// Clock: 1 GHz (1 nanosecond cycle time)
// Corrected version based on forensic dossier findings.
// Changes:
//  - Added synchronous reset (rst) to initialize all registers.
//  - Only latch prices when both valid flags are high to avoid stale data.
//  - Output full 64‑bit prices (trade_signal widened to 128 bits).
//  - Made threshold a parameter with documented fixed‑point format.
//  - Added comments about fixed‑point scaling and input synchronization.
//  - Pipeline depth remains 3 cycles.

module arb_detector #(
    parameter [63:0] THRESHOLD = 64'h00000000000D1B71   // 0.02% in Q32.32 fixed‑point (0.0002 * 2^32)
                                                        // For different scaling, adjust accordingly.
)(
    input wire clk,                    // 1 GHz clock
    input wire rst,                    // Synchronous reset (active high)
    input wire [63:0] price_a,          // 64‑bit fixed point from exchange A (direct NIC DMA)
    input wire [63:0] price_b,          // 64‑bit fixed point from exchange B
    input wire price_a_valid,           // data valid flag
    input wire price_b_valid,
    output reg [127:0] trade_signal,    // Concatenated {price_a, price_b} when trade detected
    output reg trade_valid
);

    // Pipelined comparison - each stage takes 1 clock cycle
    reg [63:0] a_reg, b_reg;
    reg [63:0] diff;

    // Note: If price_a/price_b come from asynchronous clock domains,
    // they must be synchronized externally (e.g., with double flops)
    // before connecting to this module.

    always @(posedge clk) begin
        if (rst) begin
            // Reset all registers to known state
            a_reg        <= 64'd0;
            b_reg        <= 64'd0;
            diff         <= 64'd0;
            trade_signal <= 128'd0;
            trade_valid  <= 1'b0;
        end else begin
            // Stage 1: Latch inputs only when both are valid (avoid stale mix)
            if (price_a_valid && price_b_valid) begin
                a_reg <= price_a;
                b_reg <= price_b;
            end
            // else keep previous values – pipeline holds until next matching pair

            // Stage 2: Compute absolute difference (using values latched in previous cycle)
            diff <= (a_reg > b_reg) ? (a_reg - b_reg) : (b_reg - a_reg);

            // Stage 3: Compare and output
            if (diff > THRESHOLD) begin
                trade_signal <= {a_reg, b_reg};   // full 64‑bit each → 128‑bit output
                trade_valid  <= 1'b1;
            end else begin
                trade_valid  <= 1'b0;
                // trade_signal retains its last value (common in pipeline designs)
            end
        end
    end

    // Fixed‑point format explanation:
    // Prices are assumed to be in Q32.32 fixed‑point (32 integer bits, 32 fractional bits).
    // The threshold value above corresponds to 0.02% (0.0002) in that format.
    // To change the threshold, re‑compute as (percentage_decimal * 2^32) and set the parameter.
    // Example: 0.01% = 0.0001 * 2^32 = 429496.7296 ≈ 64'h0000000000068DB8.

endmodule
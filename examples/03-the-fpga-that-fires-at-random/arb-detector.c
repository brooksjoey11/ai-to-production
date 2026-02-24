// Pulse-optimized arbitrage detector - runs directly on FPGA fabric
// Clock: 1 GHz (1 nanosecond cycle time)
// Fully pipelined (3 stages) with reset and full-price output.
// Fixed-point format for prices and threshold is defined externally;
// default threshold corresponds to 0.02% under that format.

module arb_detector (
    input wire clk,                    // 1GHz clock
    input wire rst,                    // synchronous reset (active high)
    input wire [63:0] price_a,          // 64-bit fixed point from exchange A
    input wire [63:0] price_b,          // 64-bit fixed point from exchange B
    input wire price_a_valid,           // data valid flag
    input wire price_b_valid,
    output reg [127:0] trade_signal,    // concatenated full prices (a, b)
    output reg trade_valid
);

    // Default threshold: 0x51E represents 0.02% in the external fixed‑point format.
    // Make threshold a parameter so it can be overridden at synthesis time.
    parameter [63:0] THRESHOLD = 64'h000000000000051E;

    // Pipeline registers
    reg [63:0] a_reg, b_reg;            // Stage1: latched prices
    reg        a_valid_d1, b_valid_d1;  // Stage1: valid flags (delayed one cycle)
    reg [63:0] diff;                    // Stage2: absolute difference
    reg        diff_valid;               // Stage2: diff is valid (both prices were fresh)

    // Three‑stage pipeline: latch, compute difference, compare and output
    always @(posedge clk) begin
        if (rst) begin
            // Reset all registers to known state
            a_reg       <= 64'd0;
            b_reg       <= 64'd0;
            a_valid_d1  <= 1'b0;
            b_valid_d1  <= 1'b0;
            diff        <= 64'd0;
            diff_valid  <= 1'b0;
            trade_signal <= 128'd0;
            trade_valid  <= 1'b0;
        end else begin
            // ------------------- Stage 1: Latch inputs -------------------
            // Update price registers only when valid, otherwise hold last value.
            a_reg <= price_a_valid ? price_a : a_reg;
            b_reg <= price_b_valid ? price_b : b_reg;
            // Capture valid flags exactly when they arrive.
            a_valid_d1 <= price_a_valid;
            b_valid_d1 <= price_b_valid;

            // ------------------- Stage 2: Compute difference ---------------
            // Compute absolute difference only if both prices were valid
            // at the time they were latched (i.e., in the previous cycle).
            if (a_valid_d1 && b_valid_d1) begin
                diff <= (a_reg > b_reg) ? (a_reg - b_reg) : (b_reg - a_reg);
                diff_valid <= 1'b1;
            end else begin
                // If either price is stale, mark the difference as invalid.
                diff_valid <= 1'b0;
                // diff retains its previous value; it will not be used.
            end

            // ------------------- Stage 3: Compare and output ---------------
            // Generate trade signal only when we have a valid difference
            // and it exceeds the threshold.
            if (diff_valid && (diff > THRESHOLD)) begin
                // Output full 64‑bit prices concatenated into a 128‑bit bus.
                trade_signal <= {a_reg, b_reg};
                trade_valid  <= 1'b1;
            end else begin
                trade_valid <= 1'b0;
                // trade_signal may be left unchanged (not used when valid is low).
            end
        end
    end

endmodule
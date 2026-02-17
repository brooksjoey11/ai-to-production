// Pulse-optimized arbitrage detector - runs directly on FPGA fabric
// Clock: 1 GHz (1 nanosecond cycle time)

module arb_detector(
    input wire clk,                    // 1GHz clock
    input wire [63:0] price_a,          // 64-bit fixed point from exchange A (direct NIC DMA)
    input wire [63:0] price_b,          // 64-bit fixed point from exchange B
    input wire price_a_valid,           // data valid flag
    input wire price_b_valid,
    output reg [63:0] trade_signal,     // output to execution engine
    output reg trade_valid
);

    // Pipelined comparison - each stage takes 1 clock cycle
    reg [63:0] a_reg, b_reg;
    reg [63:0] diff;
    reg [63:0] threshold = 64'h000000000000051E; // 0.02% in fixed-point
    
    always @(posedge clk) begin
        // Stage 1: Latch inputs
        a_reg <= price_a_valid ? price_a : a_reg;
        b_reg <= price_b_valid ? price_b : b_reg;
        
        // Stage 2: Compute difference (absolute value in parallel)
        diff <= (a_reg > b_reg) ? (a_reg - b_reg) : (b_reg - a_reg);
        
        // Stage 3: Compare and output
        if (diff > threshold) begin
            trade_signal <= {a_reg[31:0], b_reg[31:0]}; // Pack both prices
            trade_valid <= 1'b1;
        end else begin
            trade_valid <= 1'b0;
        end
    end
endmodule
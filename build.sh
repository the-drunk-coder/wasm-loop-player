#!/bin/sh -e

echo "compile wasm"
cargo build --target wasm32-unknown-unknown --release

echo "copy"
cp target/wasm32-unknown-unknown/release/wasm_loop_player.wasm ./wasm/

echo "finish!"

#[macro_use]
extern crate lazy_static;

use std::sync::Mutex;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    let vec: Vec<f32> = vec![0.0; size];
    Box::into_raw(vec.into_boxed_slice()) as *mut f32
}

mod binaural_loop_player;

lazy_static! {
    static ref LOOPER: Mutex<binaural_loop_player::BinauralLoopPlayer> = Mutex::new(binaural_loop_player::BinauralLoopPlayer::new());
}

#[no_mangle]
pub extern "C" fn process(out_ptr_l: *mut f32, out_ptr_r: *mut f32, size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.process(out_ptr_l, out_ptr_r, size);
}

#[no_mangle]
pub extern "C" fn set_sample_data_raw(sample_ptr: *mut f32, sample_size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_sample_data_raw(sample_ptr, sample_size);
}

#[no_mangle]
pub extern "C" fn set_ir_data_raw(sample_ptr: *mut f32, sample_size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_ir_data(sample_ptr, sample_size);
}

#[no_mangle]
pub extern "C" fn set_azimuth(azi: f32) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_azimuth(azi);
}

#[no_mangle]
pub extern "C" fn set_elevation(ele: f32) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_elevation(ele);
}

#[no_mangle]
pub extern "C" fn enable() {
    let mut looper = LOOPER.lock().unwrap();
    looper.enable();
}

#[no_mangle]
pub extern "C" fn disable() {
    let mut looper = LOOPER.lock().unwrap();
    looper.disable();
}





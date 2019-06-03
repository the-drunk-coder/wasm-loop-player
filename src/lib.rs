#[macro_use]
extern crate lazy_static;

use std::sync::Mutex;

mod loop_player;

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    let mut buf = Vec::<f32>::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr as *mut f32
}

lazy_static! {
    static ref LOOPER: Mutex<loop_player::LoopPlayer> = Mutex::new(loop_player::LoopPlayer::new());
}

#[no_mangle]
pub extern "C" fn process(out_ptr: *mut f32, size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.process(out_ptr, size);
}

#[no_mangle]
pub extern "C" fn set_sample_data_raw(sample_ptr: *mut f32, sample_size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_sample_data_raw(sample_ptr, sample_size);
}



fn main() {
    println!("cargo:rustc-link-search=native=/usr/lib");
    println!("cargo:rerun-if-changed=src/");

    let profile = std::env::var("PROFILE").unwrap_or_default();
    println!("cargo:rustc-env=LABYR_BUILD_PROFILE={}", profile);
}

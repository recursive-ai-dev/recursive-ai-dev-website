.PHONY: all clean

ROOTFS_DIR := $(CURDIR)/../../build/initramfs
INITRAMFS_CPIO := $(CURDIR)/../../build/initramfs.cpio.gz
INITRAMFS_DIR := $(CURDIR)

all: $(INITRAMFS_CPIO)

$(INITRAMFS_CPIO): $(INITRAMFS_DIR)/init $(INITRAMFS_DIR)/rcS
	mkdir -p $(ROOTFS_DIR)
	cp $(INITRAMFS_DIR)/init $(ROOTFS_DIR)/init
	cp $(INITRAMFS_DIR)/rcS $(ROOTFS_DIR)/rcS
	chmod +x $(ROOTFS_DIR)/init $(ROOTFS_DIR)/rcS
	cd $(ROOTFS_DIR) && \
		find . -print0 | cpio --null -o --format=newc | gzip -9 > $(INITRAMFS_CPIO)
	@echo "Initramfs built: $(INITRAMFS_CPIO)"

$(INITRAMFS_DIR)/init: $(INITRAMFS_DIR)/init.in
	cp $< $@

$(INITRAMFS_DIR)/rcS: $(INITRAMFS_DIR)/rcS.in
	cp $< $@

clean:
	rm -rf $(ROOTFS_DIR)
	rm -f $(INITRAMFS_CPIO)

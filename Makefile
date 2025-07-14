user-rpc-test:
	@make -f deploy/makefile/user-rpc.mk release-test

release-test: user-rpc-test

install-server-test:
	cd ./deploy/script && chmod +x release-test.sh && ./release-test.sh
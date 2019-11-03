.PHONY: clean build-js

clean:
	rm -f build/js/*.js
	rm -f output/*

run:
	./node_modules/ts-node/dist/bin.js clientlib/src/example.ts

clean-run: clean
	./node_modules/ts-node/dist/bin.js clientlib/src/example.ts

build-js: clean
	./node_modules/typescript/bin/tsc -p tsconfig.json

run-js: build-js
	node build/js/example.js

run-server:
	./node_modules/ts-node/dist/bin.js server/src/DBExecutorServer.ts

dep:
	npm install

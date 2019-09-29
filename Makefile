.PHONY: clean build-js

clean:
	rm -f *.js
	rm -f output/*

run:
	./node_modules/ts-node/dist/bin.js example.ts

clean-run: clean
	./node_modules/ts-node/dist/bin.js example.ts

build-js: clean
	./node_modules/typescript/bin/tsc -p tsconfig.json

run-js: build-js
	node example.js

dep:
	npm install

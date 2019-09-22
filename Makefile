run:
	ts-node example.ts

buildjs:
	tsc -p tsconfig.json

runjs:
	node example.js

dep:
	npm install

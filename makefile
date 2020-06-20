	rm -f ./*.xpi
	zip -r -9 TST-Lock.xpi manifest.json background.js lock.png -x '*/.*' >/dev/null 2>/dev/null

xpi: 
	rm -f ./*.xpi
	zip -r -9 TST-Lock.xpi images manifest.json background.js lock.png -x '*/.*' >/dev/null 2>/dev/null

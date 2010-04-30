#
# This was hacked together very fast and dirty
#

.PHONY: all build

all: build

build:
	node tools/parser.js tools/xml/amqp-0.9.1.xml


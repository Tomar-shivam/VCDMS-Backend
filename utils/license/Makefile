#
# Makefile to create 'license'
#

CC=gcc
CCFLAGS= -m64 -Wall -O2 -DSL -DKL3HID -DLINUX64 

license:license.o
	$(CC) $(CCFLAGS) -o license license.o -L../lib/ -lkfunc64

license.o : license.c client.h keyerror.h Makefile
	$(CC) $(CCFLAGS) -o license.o -DLINUX64 -c license.c

clean:
	rm -f license

#include <stdio.h>
#include <stdlib.h>      // exit, srand, rand, itoa
#include <time.h>        // time
#include <string.h>      // strcpy, strcat
#include <ctype.h>      // toupper

#include "client.h"      // device unique codes
#include "keyerror.h"  // KEY-LOK error codes


/* COMMAND CODES */
#define TERMINATE      -1
#define KLCHECK         1
#define READAUTH        2
#define GETSN           3
#define GETVARWORD      4
#define WRITEAUTH       5
#define WRITEVARWORD    6
#define DECREMENTMEM    7
#define GETEXPDATE      8
#define CKLEASEDATE     9
#define SETEXPDATE     10
#define GETMAXUSERS    12
#define REMOTEUPDUPT1  13
#define REMOTEUPDUPT2  14
#define REMOTEUPDUPT3  15
#define REMOTEUPDCPT1  16
#define REMOTEUPDCPT2  17
#define REMOTEUPDCPT3  18
#define GETNWCOUNTS    20
#define DOREMOTEUPDATE	21
#define SETLONGSN   31
#define CKREALCLOCK	82
#define BLOCKREAD	84
#define BLOCKWRITE	85
#define GETLONGSN	89
#define GETDONGLETYPE	33

/* EXTERNAL FUNCTION PROTOTYPES */
extern unsigned long KFUNC(unsigned, unsigned, unsigned, unsigned);
extern unsigned long GetLastKeyError(void);

/* FUNCTION PROTOTYPES */
void KTASK(unsigned, unsigned, unsigned, unsigned);
unsigned RotateLeft(unsigned int, int);

unsigned long ReturnValue;
unsigned short ReturnValue1, ReturnValue2;

void CheckKey() {
  KTASK((unsigned)(KLCHECK), ValidateCode1, ValidateCode2, ValidateCode3);
  KTASK(RotateLeft(ReturnValue1, ReturnValue2 & 7) ^ ReadCode3 ^ ReturnValue2,
        RotateLeft(ReturnValue2, ReturnValue1 & 15),
        ReturnValue1 ^ ReturnValue2, 0);
  // NOTE: Higher security can be achieved by using return values in
  //       computations and performing comparison of computed values to
  //       expected values deeper in your code than here.
  if ((ReturnValue1 == ClientIDCode1) && (ReturnValue2 == ClientIDCode2))
  {
    KTASK(GETDONGLETYPE,0,0,0);
    if(ReturnValue1 == 2) {
        KTASK(READAUTH, ReadCode1, ReadCode2, ReadCode3);
        KTASK(GETVARWORD, 0, 0, 0);
        printf("%u\n",ReturnValue1);
    }
  }
}

/**************************************************************************/
/********************************* KTASK **********************************/
/**************************************************************************/
void KTASK(unsigned CommandCode, unsigned Argument2,
           unsigned Argument3, unsigned Argument4)
/* This routine makes the security system call. */
{
    //unsigned long int ReturnValue;
    ReturnValue = KFUNC(CommandCode, Argument2, Argument3, Argument4);
    ReturnValue1 = (unsigned) (ReturnValue & 0XFFFF);
    ReturnValue2 = (unsigned) (ReturnValue >> 16);
}

/**************************************************************************/
/******************************* RotateLeft *******************************/
/**************************************************************************/
unsigned RotateLeft(unsigned Target, int Counts)
/* This function rotates the bits in the Target left the number of positions
   identified by the argument Counts */
{
    int i;
    static unsigned LocalTarget, HighBit;

    LocalTarget = Target;
    for (i=0; i<Counts; i++)
    {
        HighBit = LocalTarget & 0X8000;
        LocalTarget = (LocalTarget << 1) + (HighBit >> 15);
    }
    LocalTarget = LocalTarget & 0XFFFF; /* For 32 bit integers */
    return (LocalTarget);
}

int main()
{
	CheckKey();
	return 0;
}

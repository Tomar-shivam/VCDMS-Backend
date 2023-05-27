#include <stdio.h>
#include <stdlib.h>      // exit, srand, rand, itoa
#include <time.h>        // time
#include <string.h>      // strcpy, strcat
#include <ctype.h>      // toupper

#include "client_demo.h"      // device unique codes
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

/* LEASE EXPIRATION & REMOTE UPDATE CONSTANTS */
#define BASEYEAR         1990  // Reference for expiration dates


/* EXTERNAL FUNCTION PROTOTYPES */
extern unsigned long KFUNC(unsigned, unsigned, unsigned, unsigned);
extern unsigned long GetLastKeyError(void);

/* FUNCTION PROTOTYPES */
void KTASK(unsigned, unsigned, unsigned, unsigned);
unsigned RotateLeft(unsigned int, int);
void PrintDate(int month, int day, int year);

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
    printf("The proper KEY-LOK security device is attached.\n");
    printf("Dongle Type = %d.\n",ReturnValue1);

    KTASK(READAUTH, ReadCode1, ReadCode2, ReadCode3);

    KTASK(GETSN, 0, 0, 0);
    printf("Device serial number = %d.\n",ReturnValue1);

    KTASK(GETLONGSN,0,0,0);
    printf("Long serial number: 0x%x (%ld)\n",(unsigned int)ReturnValue, (long int)ReturnValue);

    // KTASK(GETNWCOUNTS, 0, 0, 0);
    // printf("Current Number of Users = %d Max = %d.\n",ReturnValue1,ReturnValue2);

    // KTASK(GETMAXUSERS,0,0,0);
    // printf("Max Users = %d.\n",ReturnValue1);

    KTASK(GETVARWORD, 0, 0, 0);
    printf("\nThe current content of this cell 0 is %u.\n",ReturnValue1);

    KTASK(GETVARWORD, 1, 0, 0);
    printf("\nThe current content of this cell 1 is %u.\n",ReturnValue1);

    // Read and Convert Lease Expiration Date to Readable Format from Storage Format
    unsigned DateRead;
    int ExpYear, ExpMonth, ExpDay;
    KTASK(GETEXPDATE, 0, 0, 0);
    DateRead = ReturnValue1;
    ExpYear = ((DateRead & 0XFE00) / 512) + BASEYEAR;
    ExpMonth = (DateRead & 0X1E0) / 32;
    ExpDay = (DateRead & 0X1F);
    printf("The lease is set to expire on : ");
    PrintDate(ExpMonth, ExpDay, ExpYear);

  }
  else
    printf("No KEY-LOK or wrong KEY-LOK device attached.\n");
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

/**************************************************************************/
/****************************** PrintDate *********************************/
/**************************************************************************/
void PrintDate(int month, int day, int year)
{
    char monthA[3], dayA[3], yearA[5], msg[11];

    sprintf(monthA,"%d",month);
    sprintf(dayA,"%d",day);
    sprintf(yearA,"%d",year);
    strcpy(msg, "");
    strcat(msg, monthA);
    strcat(msg,"/");
    strcat(msg, dayA);
    strcat(msg,"/");
    strcat(msg, yearA);
    printf ("%s\n",msg);
}

int main()
{
	CheckKey();
	return 0;
}

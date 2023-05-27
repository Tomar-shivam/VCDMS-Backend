//**************************************************************************
// KEYERROR.H   -  $Revision: 1.3 $  -  $Date: 1996/01/03 17:48:39 $
//**************************************************************************
//
// KEY-LOK (TM) Security System
// (C) Copyright 1986-2003 - by Microcomputer Applications - All rights reserved
//
// NOTICE:  THIS DOCUMENT CONTAINS CONFIDENTIAL AND PROPRIETARY DATA
// PROTECTED UNDER THE TRADE SECRET PROVISIONS OF FEDERAL AND STATE LAW.
//
//**************************************************************************
//                         MODULE  DESCRIPTION
// Module Name:
//
//     keyerror.h
//
// Abstract:
//
//     User-defined error codes set into calling app's
//     GetLastError function.  These can be distinguished from regular
//     windows error codes because bit 29 is set.
//
// Environment:
//
//     Kernel mode and User mode
//***************************************************************************

#ifndef KEYERROR_H_
#define KEYERROR_H_


//********************************************************************
//************* S T A T U S  and  E R R O R   C O D E S  *************
//********************************************************************
//
// The driver can return various "status and error codes" to the calling
// application by setting the Return DWORD.  (Remember that these status
// returns are not the same as the NT I/O Manager's status returns for
// an IRP.) In may cases, the error return is in the high WORD of reply.
//

// ReturnWord Status Codes specific to KEYTAG KeyLok commands:

#define KEY_STATUS_NOERROR        0
#define KEY_STATUS_BUNOTUPDATED   1
#define KEY_STATUS_KTFLAGPRBLM    2
#define KEY_STATUS_WRONGKT        3
#define KEY_STATUS_WRONGKTSN      4
#define KEY_STATUS_KTNOTERASED    5
#define KEY_STATUS_KTUSED         6
#define KEY_STATUS_WRITETIMEOUT   7        // Not necessarily write failure

// ReturnWord Status codes for Lease Expiration Date:

#ifdef KL2
	#ifdef KL1RTC  // 5/22/00 addition for Tracer
		#define KEY_STATUS_LEASEOVER      1
		#define KEY_STATUS_SYSDATESETBK   2
		#define KEY_STATUS_NOLEASEDATE    3
		#define KEY_STATUS_LEASEDATEBAD   4
		#define KEY_STATUS_FSDATEBAD      5
	#else  // Standard KL2
		#define KEY_STATUS_LEASEOVER      0xfffe
		#define KEY_STATUS_SYSDATESETBK   0xfffd
		#define KEY_STATUS_NOLEASEDATE    0xfffc
		#define KEY_STATUS_LEASEDATEBAD   0xfffb
		#define KEY_STATUS_FSDATEBAD      0xfffa
	#endif // KL1RTC
#else // KL1
	#define KEY_STATUS_LEASEOVER      1
	#define KEY_STATUS_NORTC          2
	#define KEY_STATUS_NOLEASEDATE    3
	#define KEY_STATUS_LEASEDATEBAD   4
	#define KEY_STATUS_FSDATEBAD      5
#endif //KL2

// ReturnWord Decrement Counter status codes:

#define KEY_STATUS_NOCOUNTSLEFT   1
#define KEY_STATUS_INVALIDADDRESS 2
#define KEY_STATUS_NOWRITEAUTH    3


// Starting with the Win95 version, the 32 bit API can return the error
// code to caller using GetLastError.  System-generated error codes
// are defined in error.h;  User error codes are flagged by setting
// bit 29 in the status word, and the user must parse their meaning.

// GetLastError() returns codes so 32bit api caller can see results:

#define KEY_ERROR_NOERROR         0x00000000
#define KEY_ERROR_NOKEYLOK_ALSO   0x00000002
#define KEY_ERROR_NO_SESSIONS     0x00000005  // Same as ERROR_ACCESS_DENIED
#define KEY_ERROR_NOKEYLOK        0x20000001  // No keylok found on port/lan.
#define KEY_ERROR_BADVERSION      0x20000002  // Driver/kfunc version mismatch
#define KEY_ERROR_BADFUNC         0x20000003  // Illegal kfunc command
#define KEY_ERROR_WRONGKEYLOK     0x20000004  // Authenticate doesn't match
#define KEY_ERROR_NOREADAUTH      0x20000005  // Read Auth wrong or not done
#define KEY_ERROR_NOWRITEAUTH     0x20000006  // Write Auth wrong or not done
#define KEY_ERROR_INVALIDADDRESS  0x20000007  // Bad KeyLok Device Address
#define KEY_ERROR_NOCOUNTSLEFT    0x20000008  // Decrement Counter already 0
#define KEY_ERROR_WRITETIMEOUT    0x20000009  // D0 did not go high in time
#define KEY_ERROR_NOKEYTAG        0x2000000a  // No keytag present
#define KEY_ERROR_WRONGKT         0x2000000b  // Wrong KeyTag
#define KEY_ERROR_WRONGKTSN       0x2000000c  // Wrong KeyTag Serial Number
#define KEY_ERROR_KTNOTERASED     0x2000000d  // KeyTag not erased
#define KEY_ERROR_KTUSED          0x2000000e  // KeyTag already used once
#define KEY_ERROR_BUNOTUPDATED    0x2000000f  // KeyTag did not update Keylok
#define KEY_ERROR_LEASEOVER       0x20000010  // KL2 Lease Expiration
#define KEY_ERROR_SYSDATESETBK    0x20000011  // KL2 System Date Setback Error
#define KEY_ERROR_NOLEASEDATE     0x20000012  // KL2 No Lease Date
#define KEY_ERROR_LEASEDATEBAD    0x20000013  // KL2 Lease Date Bad
#define KEY_ERROR_FSDATEBAD       0x20000014  // KL2 FS Date Bad ??????
// Attempting to perform some other task before doing authentication or after
// having done TERMINATE will return junk from netbios call
#define KEY_ERROR_LANRETURNSJUNK  0x20000015
/* Real time clock errors */
#define KEY_ERROR_NO_REALCLOCK	  0x20000016	// No RTC on board
#define KEY_ERROR_RTC_NO_POWER	  0x20000017	// RTC has been powered down (battery has lost power)
#define KEY_ERROR_NOAUTHENTICATE  0x20000017

//
// Remote Update Error Codes
//
#define KEY_ERROR_NOAUTHORIZEFILE		0x20000101  // Missing AUTHORIZE.DAT file
#define KEY_ERROR_CORRUPTAUTHORIZEFILE	0x20000102	// Corrupt AUTHORIZE.DAT file
#define	KEY_ERROR_WRONGDONGLE			0x20000103  // Dongle SN doesn't match AUTHORIZE.DAT
#define	KEY_ERROR_WRONGRANDOMVALUE		0x20000104  // Dongle Random Value doesn't match AUTHORIZE.DAT
#define	KEY_ERROR_WRONGFILEVERSION		0x20000105  // Last remote update file version processed
													// and stored within the dongle is not
													// compatible with the file version identifier
                                                    // stored within the ACTIVATE.DAT file

//
// Codes added for USB dongle support
//
#define KEY_ERROR_INITTIMEOUT     0x20000016  // Timeout during write to init memory
#define KEY_ERROR_NOTZERO         0x20000017  // Expect zero in memory, but failed
#define KEY_ERROR_TIMEOUTLOW      0x20000018  // Timeout during write to address 0
#define KEY_ERROR_TIMEOUTHIGH     0x20000019  // Timeout during write to address WORDCOUNT-1
#define KEY_ERROR_WRITELOWBAD     0x2000001A  // Address '0' does not contain 0x1122
#define KEY_ERROR_WRITEHIGHBAD    0x2000001B  // Top Address does not contain 0x2244
#define KEY_ERROR_TIMEOUTPRCLEAR  0x2000001C  // Time out during clear of Protect Register
#define KEY_ERROR_TIMEOUTPRWRITE  0x2000001D  // Time out during write of Protect Register
#define KEY_ERROR_PRWRITE         0x2000001E  // Protect Register contains wrong value
#define KEY_ERROR_TIMEOUTLOW2     0x2000001F  // Timeout during final write to address 0
#define KEY_ERROR_TIMEOUTHIGH2    0x20000020  // Timeout during final write to address WORDCOUNT-1
#define KEY_ERROR_WRITELOWBAD2    0x20000021  // Address '0' does not contain 0 after erasure
#define KEY_ERROR_WRITEHIGHBAD2   0x20000022  // Top Address altered despite PR freeze
#define KEY_ERROR_TIMEOUTPRCLEAR2 0x20000023  // Time out during clear of Protect Register
#define KEY_ERROR_TIMEOUTHIGH3    0x20000024  // Timeout during final clear of address WORDCOUNT-1 to 0
#define KEY_ERROR_WRITEHIGHBAD3   0x20000025  // Top Address not cleared to zero during final write
#define KEY_ERROR_TIMEOUTWRITE    0x20000026  // Timed out during write to memory
#define KEY_ERROR_WRITEBAD        0x20000027  // Failed write verification
#define KEY_ERROR_PRDISABLE       0x20000028  // Failed attempt to disable Protect Register

//
// Codes for USB Linux Support
//
#define KEY_ERROR_SUCCESS					0x20000201
#define KEY_ERROR_DONGLE_NOT_DETECTED		0x20000202
#define KEY_ERROR_FAILED_OPENING_HANDLE		0x20000203
#define KEY_ERROR_FAILED_SET_CONFIGURATION	0x20000204
#define KEY_ERROR_FAILED_CLAIM_INTERFACE	0x20000205
#define KEY_ERROR_FAILED_CONTROL_MESSAGE 	0x20000206

// Error codes related to execution of client algorithm embedded within Fortress dongle
#define KEY_ERROR_FORTRESS_NOAUTHENTICATION	0x20000301	// KEYLOK Authentication has not been performed.
#define KEY_ERROR_FORTRESS_NOFOLDER		0x20000302	// Client subfolder with desired program not found.
#define KEY_ERROR_FORTRESS_WRONGPIN		0x20000303	// Client subfolder with desired program does not authenticate
#define KEY_ERROR_EXE_ERROR			0x20000304	// Client EXE error

#endif // KEYERROR_H_


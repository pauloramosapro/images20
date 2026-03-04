#########################################################################################################################
###    IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE   IMAGES.EXE
#########################################################################################################################
#### Author   : Gerard van Nes
#### Date     : 13-jul-2021
#### File     : /cgi-bin/images.pl --> images.exe (via perl2exe.exe) --> images.zip
#### Modulen  : requires module: instelling.pm (met instellingsgegevens) 
#### Purpose  : aanmaak en ftp small/large/100pct images
#### Levering : images.pl wordt omgezet naar images.exe via perl2exe en in .zip geleverd met images.ini en i_view32.exe
####
#########################################################################################################################
#### Progflow : www.zcbs.nl/cgi-bin/documentatie/addenda/042_images_flow.txt        (output van Perl-script: progflow.pl)
#########################################################################################################################
####
#### Printen  : 1. perl -ne "print \"$.:  $_\"" images.pl > prut.txt
####            2. prut.txt --> ms-word; 6pt courier listing; one page on A4 page; dubbelzijdig
####             ==116== regels per pagina!!  ==> right page = ##xx   (1769 lines; 19p.)
####
#### Versie   : 0.2  28-sep-2011 : Eerste testversie
####            0.7  22-nov-2011 : Eerste tests bij enkele gebruikers (Sytze, Gerard H, Jeroen)
####            0.8  28-nov-2011 : Bug bij vermelden toepassingen; binary upload ipv default; images.ini file
####            0.9  15-nov-2011 : Opvangen user interrupt ctrl-C  (WERKT NOG NIET!!!)
####            0.9  19-dec-2011 : MS-Windows ftp.exe kent geen PASV!! Zodoende NET::FTP gebruikt
####            0.9  19-dec-2011 : Keuze resolutie
####            0.9  15-nov-2011 : Opvangen user interrupt ctrl-C  (WERKT NOG NIET!!!)
####            0.9  19-nov-2011 : Diverse controles
####            0.9  29-dec-2011 : Domein mijndomein.nl toegevoegd + kleine correcties
####            1.0  20-jan-2012 : Wat kleine aanpassingen + kleur toegevoegd       
####            1.0  20-jan-2012 : ====> VOOR DISTRIBUTIE NAAR INTERNET <====
####            1.0  28-jan-2012 : Aanpassing i.v.m. spaties in dir/file namen
####            1.1  09-feb-2012 : Naast .jpg nu ook .tif en .bmp
####            1.1  10-feb-2012 : Beide logfiles samengevoegd tot 1
####            1.1  17-apr-2012 : Include common file: instelling.pm
####            1.1  18-apr-2012 : Tevens aanmaken nieuwe lege records (wisselende nummers Zuidwolde)
####            1.1  29-apr-2012 : Teller ipv puntjes bij Irfanview + aparte ftp sessie updatedatabase + check updatedatabase
####            1.1  15-mei-2012 : Afhandeling -z afbeeldingen; alleen voor \large
####            1.1  06-jun-2012 : Check met perl -w images.pl  (== use warnings; ==)
####            1.2  10-jul-2012 : FTP van images met Perl FTP i.p.v. Windows FTP (probleem Oostkappel) + toevoeging counter
####            1.2  19-aug-2012 : Bug fixing
####            1.2  28-sep-2012 : Diverse kleine aanpassingen
####            1.2  28-sep-2012 : ====> VOOR DISTRIBUTIE NAAR INTERNET <====
####            1.3  27-nov-2012 : Ook images met letters aan begin bestandsnaam zijn nu toegestaan
####            1.3  02-dec-2012 : Commando use cwd (t.b.v. $ROOT) + diverse aanpassingen
####            1.4  20-jan-2013 : Afwijkende databasenummers bij letters in bestandsnaam nu toegestaan
####            1.4  20-jan-2013 : Verwijderingsverzoek m.b.t.: updates-new.txt + mappen [small], [large], en [100pct] op eind sessie
####            1.4  20-jan-2013 : Aanmaken van een lege servermap + diverse kleine aanpassingen
####            1.4  22-jan-2013 : Prompt voor verwijderen inhoud map [images] + aanpassing breedte DOS window (anders verminking ANSI code)
####            1.4  22-jan-2013 : Aanpassing in de prompt bij keuze lege_map_aanmaken
####            1.4  23-jan-2013 : Check op lege map (=$ftp->ls= geeft dan foutmelding: PERL2EXE_STORAGE/Net/FTP/dataconn.pm ....
####            1.4  24-jan-2013 : Diverse kleine aanpassingen + input .gif en .jpeg toegevoegd
####            1.4  24-jan-2013 : ====> VOOR DISTRIBUTIE NAAR INTERNET <====
####            1.4  27-feb-2013 : check $dir > 2 --> $dir > 1 op server
####            1.4  27-feb-2013 : ====> VOOR DISTRIBUTIE NAAR INTERNET <====
####            1.5  28-jun-2013 : Bij lege map [images] --> bestanden met specifieke bestandsnamen elders (via @IMAGE_RENAME en images-rename.txt)
####            1.6  05-sep-2013 : Upgrade naar Perl 5.16.3 en Perl2Exe 16.00
####            1.6  05-sep-2013 : Aanpassingen find functie i.v.m. andere versie: $File::Find::name = $File::Find::dir + $_  en find(\&wanted, @dirs_to_search);
####            1.7  19-jan-2014 : .png toegevoegd
####            1.8  11-feb-2014 : Leeg veld met applicatienamen --> Images.pl zoek er zelf naar
####            1.8  11-feb-2014 : Log naar /cgi-bin/misc/backup.log
####            1.9  18-feb-2014 : 4e images import (37:Lichtenvoorde) : bestandsnaam begint met recordnummer (b.v.: 0307 Lichtenvoorde van Heijdenstraat 26-8-1993.jpg)
####            1.9  18-feb-2014 : overzicht beschikbare mappen lijkt nu goed weergegeven te worden voor verschillende hostproviders
####            1.9  26-feb-2014 : na fout wachtwoord werd bij upload updates.txt niet opnieuw ingelogd ($nT_FTP = "";)
####            2.0  26-feb-2014 : Berkhout : 451 updates.txt: Append/Restart not permitted ==> gehele updates.txt wordt dan geuploaded
####            2.1  26-apr-2014 : Foutje bij zoeken Irfanview x86 versie
####            2.1  12-mei-2014 : Leeg toepassingenveld instelling -> zoek toepassingen (ftp->size werkt niet)    
####            2.1  17-jun-2014 : Bug in IMAGE_RENAME (sinds 18-02-2014) + sub LOGGING
####            2.2  11-nov-2014 : Kleine correcties
####            2.21 01-mei-2015 : .psd (NLR) toegevoegd. ECHTER GD::Image kan geen psd aan --> de 100pct dus (nog) niet verkleinen!!!
####            2.22 22-oct-2015 : Diverse aanpassingen; inlezen config file + aanmaak update records
####            2.5  27-jan-2016 : Invoer gedeelte geheel herzien + diverse/vele andere aanpassingen 
####            3.0  10-feb-2016 : ====> VOOR DISTRIBUTIE NAAR INTERNET <====
####            3.01 15-feb-2016 : Aanpassing i.v.m. foutmelding geen files op webserver (PERL2EXE_STORAGE/Net/FTP/dataconn.pm line 54, <STDIN> line 5)
####            3.02 02-apr-2016 : Wieringermeer: aanpassingen in sub INI en altijd prompt check type image A,B,C,D,E
####            3.03 20-mei-2016 : Bug bij type D images (werd E van gemaakt door overbodige regel...); daarnaast werd D niet goed in map images geplaatst
####            3.04 07-jul-2016 : BUG bij prompt "nieuwe submap?" Een en ander herschreven
####            3.05 11-nov-2016 : BUG: next if ($line !~ /(.+)\.(jpg|bmp|tif|gif|jpeg|png|psd)/i);
####            3.06 05-jan-2017 : Aanpassing van correctie 15-feb-2016 (toonde lege submappen bij submappenkeuze)
####            3.07 01-feb-2017 : Aanpassing m.b.t. globale en locale cfg-cbs.pl
####            3.07 04-mar-2017 : Backup.log verwijderd
####            3.07 28-mar-2017 : Timeout=>120 naar Timeout=>300  (Timeout bij Hoeksche Waard)
####            3.08 21-apr-2017 : Extra $idir bij check dir structuur website
####            3.09 03-mei-2017 : Bug: bij SUBMAP keuze (zie e-mail Hes Niesten)
####            3.10 02-jul-2017 : if (@ls_s < 50000) toegevoegd daarbij b.v. bij 80.000 imagebestanden/regels (= 3.4Mbyte) het ca. 5 minuten doorlooptijd kost per ls !!
####            3.11 31-jul-2017 : Naast .tif nu ook .tiff (mac gebruikers, Stedum)
####            3.12 04-aug-2017 : Submap keuze automatisch bij input xxx (splitsen in duizendtallen)
####            3.13 19-feb-2018 : Bug : @IMAGE_RENAME > 0 (was > 1); geen invulling record 27 bij 1 image upload
####            3.14 07-jun-2018 : $APPL uitgeschakeld; zoekt nu zelf naar applicaties
####            3.14 10-jun-2018 : Geen keuze meer bij 1 $APPL
####            3.15 31-oct-2018 : &INI weer geplaatst i.p.v. bij instelling.pm
####            3.20 23-mei-2019 : INSERT (F en D) toegevoegd (o.a. voor Urk)
####            3.25 14-aug-2019 : PDF type toegevoegd aan: $FILE_TYPE; VEREIST: plugins/Postscript.dll
####            3.26 29-apr-2021 : $MAX_OBJECT_LENGTH niet goed berekend bij $MAX_OBJECT < 9
####            3.27 05-jun-2021 : Nu ook jfif (Stichting Nieuw Sion); Irfanview geeft wel een melding waarop ja gezegd moet worden.
####            3.28 10-jun-2021 : -p images worden niet meer als databaserecords meegenomen
####            3.29 10-feb-2022 : Hostprovider Hostnet: check op aanwezigheid updates.txt en global cfg-cbs.pl 
####
####
#########################################################################################################################
#### Opmerkingen en (mogelijke) aanpassingen:
####- zcbs/implementaties/28-dudzele (images ftp geeft foutmelding!!  
####    Can't use an undefined value as a symbol reference
####    at PERL2EXE_STORAGE/Net/FTP/dataconn.pm line 54, <STDIN> line 4
####        :-) I solved the problem using the "Passive" Parameter.
####    The error occurs when Passive is 1 - and occurs not if Passive is 0.
####    my $ftp = Net::FTP->new($server, Debug => 0, Passive => 0)
####    Maybe the reason is a firewall problem in the active case. I'm not sure. 
####
#### > FTP-foutmelding:  425 Unable to build data connection: Connection timed out
#### > bij afbreken ctrl-C nog wat opruimen (via: $SIG{INT} = \&interrupt; + sub interrupt {doeiets; exit;} etc
####
#### > Nog te doen:
####   ============
#### > testen op # cijfers recordnummer  <========= 
#### > Uploaden met skippen i.p.v. overschrijven?
#### > Ook de -z en -x plaatjes meenemen bij Irfanview!!!!!!!
#### > In Log file ook IP en Hostname
#### > Versie nummer ALLEEN aanpassen bij een duidelijke update (i.v.m. met test op nieuwe versie)    
#### > Checken op juiste image filenaam: aantal-cijfers.jpg (lc); niet bij ZBBS!!
#### > Copyright teksten op foto (Arnemuiden); via copyright file?
#### > 30-10-2012 : LOGGING: in logfile ook naam collectie: b.v. log-121030-col.txt   (handig bij meerdere collecties)
#### > 18-02-2013 : bij submappen duizentallen, afbeeldingen direct in juiste map plaatsen
#### > 02-04-2013 : os20 vanuit .tif : bestanden worden niet gecomprimeerd !!!!!!
#### > 25-05-2013 : bij melding mapaantal s/l/100pct melden dat verschil in -xyz images kan liggen...
#### > 09-05-2016 : # images op webserver wordt niet getoond (= nul???)  <=============================
#### > 09-05-2016 : Indien afwijkend type : tonen waarom (welk bestand)
#### > 01-06-2016 : Velden vullen met default waarden Plaats=Boxtel, Internet=ja, etcetc (via images-db.txt; ook eerder al verzocht door anderen)  <==============
#### > 01-06-2016 : Checken op juist aantal opgegeven zijfers (check bij uploaden en opvragen cfg-cbs.pl; daarna renamen)  <================
#### > 01-06-2016 : Automatisch plaatsen images in juiste submap server. In mappen [00], [01], etcetc. Bij keuze xx als mapnaam? En alleen als imagenaam uit cijfers bestaat. <=========
#### > 04-08-2016 : Afhandelen -p images (NLR/Vermeulen)      [AFGEHANDELD 11-07-2021]
#### > 13-09-2016 : Config kan ook op global staan met eerste velden (t.b.v. aanmaak nieuwe records) : bij ZM
#### > 18-09-2016 : Moet eerste kolom images_rename niet suffix (.jpg) bevatten???? (Ermelo/objecten) TESTEN!!!!
#### > 20-12-2016 : mkdir ( DIR [, RECURSE ]); Create a new directory with the name DIR. If RECURSE is true then mkdir will attempt to create all the directories in the given path
#### > 20-12-2016 : idem de ls werkt niet bij een boonstructuur!!
#### > 21-12-2016 : proces aanmaak en upload nieuwe databaserecords scheiden / apart prompten (Hoeksche Waard)
#### > 21-12-2016 : mogelijkheid om apart large en/of 100pct te uploaden (i.v.m. time-out tijdens upload proces; of starten waar gebleven was?) (Hoekse Waard)
#### > 02-01-2017 : Ook datum instelling1.pm etc geven
#### > 05-01-2017 : LOC_IMAGE = default veld15 bij ZBBS !!
#### > 05-02-2017 : VELD27 : wordt ook voor andere zaken gebruikt (zie e-mail Ton van Steenoven) ==> aan of uitzetten of beter: zelf veld opgeven (prompt + .ini) <===========
#### > 06-02-2017 : Prompt keuze map webserver: map [0] aanwezig; wat dan????????????????????
#### > 09-02-2017 : Logging in /misc zowel op images.log als backup.log ??? (Wieringen)
#### > 16-02-2017 : Geen -z recordnummers toelaten bij aanmaak databaserecords (Zuidwolde regelmatig)
#### > 23-03-2017 : Extra check/prompt na vraag submappen. Indien NOK dan vraagen herhalen...
#### > 28-03-2017 : Cor Spruyt: loopt bij ftp (4800) images regelmatig in timeout.
#### > 28-03-2017 : Check bij upload small, large, 100pct elke keer apart of images eerder al zijn geplaatst (gestopt vanwege timeout...)?
#### > 20-04-2017 : LOGGING: Extra info plaatsen in cgi-bin/misc/images.log
#### > 04-05-2017 : Check goed deel SUBMAP (waarom geen chop??)
#### > 04-05-2017 : Check aanwezigheid reeds bestaande images (indien aanwezig in EEN submap)
#### > 02-07-2017 : Op webserver /cgi-bin/image_count.pl om aantal images in small/large/100pct te tonen (zie opm @ls_l  = $ftp->ls)
#### > 03-08-2017 : Submap keuze automatisch bij input xxx (splitsen in duizendtallen)  NOG VERDER BEWERKEN  <============ xx3 = [99] ; xxx4 = [999]; 10k tallen
#### > 15-11-2017 : BUG : bij inlezen cfg-cbs.pl checken op require van globale cfg-cbs!! Anders geen $ID1 en $ID2      <====================== (#43 wervershoof)
#### > 09-12-2017 : LOGGING: ook opnemen welke Windows versie
#### > 03-03-2018 : Automatisch kijken welke beeldbanken er zijn (dus onafh lijst instellingen1.pm)
#### > 31-03-2018 : LOGGING: Ook gebruikersnaam PC in logfile opnemen   AFGEHANDELD
#### > 14-05-2018 : UPD_CUMM.txt ook vullen met update records
#### > 26-09-2018 : Tussentijds afbreken bij upload images opvangen?? (Hes Niesten #04) <===========================
#### > 26-09-2018 : LOGGING: nummeren upload images? en tijd elke upload plaatsen?
#### > 31-10-2018 : INI variabele RESOLUTIE (type 1-6)
#### > xx-xx-2018 : Locken DB bij upload updates.txt; of eerst naar updates.tmp en bij een MERGE dit doen???
#### > 14-01-2019 : Bij imagebestandsnaam b.v. 03861-1996.jpg wordt ongewenst 1996 als Datering geplaatst
#### > 14-01-2019 : LOGGING: ook type imagebestand vermelden ( ook in webserver images.log!!)    AFGEHANDELD
#### > 12-04-2019 : Bij aanmaak databaserecords alleen juist aantal cijfers toelaten + niet cijfers verwijderen
#### > 12-04-2019 : Image bestandsnaam -p verwijderen bij small en large
#### > 17-04-2019 : Checken op juist aantal cijfers recordnummer!!   AFGEHANDELD??
#### > 05-06-2019 : Automatisch check beschikbare beeldbanken ook 2e keer bij aanmaak records!!
#### > 30-10-2019 : $MAX_OBJECT = 10; implementeren i.p.v. = "9999999999" (Heemskerk)
#### > 12-11-2019 : RESOLUTIE aanpassen met Resolutieh gaat niet bij .tif's (foutmelding bij getBounds (regel GD::Image->newFromJpeg)
####
#### > 07-02-2020 : Gevonden 5235 bestanden type E ZOU moeten zijn ca 8200 !! (Waddinxveen); wordt mogelijk iets als 1234.jpg niet meegeteld?
#### > 18-02-2020 : Globale cfg-cbs.pl kan ook andere naam hebben! Lees require uit en lees deze apart in!!  (Ermelo)  <=======================
#### > 25-03-2020 : ls bij >10000 bestanden duurt lang : zie ook: (Google: long directory listing slow response directory), https://superuser.com/questions/1345268/ls-command-very-slow ==> ls |grep/wc ? 
#### > 07-04-2020 : melding: images.log: Append/Restart not permitted, try again  --> images.log opnieuw aanmaken!!! (#62/HW) --> melding maken!
#### 
#### > 17-04-2021 : Cor Spruit : na upload images weggegaan; ftp wordt beeindigd; daarna niet meer upload updates.txt ==> check automatisch of ftp nog in de lucht is!!
#### > 17-04-2021 : Cor Spruit : in log-file ook de tijd plaatsen
#### > 17-04-2021 : Cor Spruit : duidelijker teksten bij aanmaak database m.b.t. submappen
#### > 10-05-2021 : Mengelberg : Test bij prompt 1e record nummer of deze alleen cijfers bevat!!  (en niet f001234)
#### > 24-06-2021 : Hessel Kraaij: verminder kleurdiepte om grootte image large te verkleinen /bpp=24 of \bpp = 8 gebruiken???
#### > 10-08-2021 : GvN : in logfile bij elke grote stap ook de huidige tijd vermelden.
#### > 08-02-2022 : GvN : veld27 mist de .jpg !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  <=================================
####
####
#########################################################################################################################
#### Structuur programma:
#### --------------------
####  242: Stap A              : Inlezen en bepalen type images
####  350: Stap B              : Aanmaak afgeleiden small + large + 100pct
####  522: Stap C              : Upload images naar webserver
####  869: Stap D              : Aanmaken en upload update database
#### 1210: Stap D              : Eventueel wat opruimen?
#### 
#### 1282: sub TYPE_ABC        : Image bestanden van type A, B, of C
#### 1427: sub TYPE_DE         : Image bestanden van type D of E
#### 1556: sub wanted          : Deze subroutine wordt aangeroepen voor elke image file en elke dir in de boom
#### 1589: sub ERROR           :
#### 1604: sub interrupt       : Interrupt handlers
#### 1618: sub NUMBER_LENGTH   : Set aantal digits object/database number
#### 1650: sub DATE            : Datum subroutine
#### 1675: sub HELP            : Introductie tekst
#### 1712: sub VERSION         : Nieuwe download versie beschikbaar?
#### 1739: sub LOGGING         : Logging image upload
####
#########################################################################################################################
#########################################################################################################################
$UPDATE  = "10-02-2022";
$VERSION = "3.29";



#########################################################################################################################
## Definieren van bepaalde variabelen
#########################################################################################################################
$TXT_TYPE{A} = "Bestandstype A: Vast aantal cijfers (= recordnummer); geen letters en andere tekens";
$TXT_TYPE{B} = "Bestandstype B: Vast aantal letters + vast alleen cijfers (= recordnummer)";
$TXT_TYPE{C} = "Bestandstype C: Willekeurig aantal letters en/of cijfers (naast - en _ geen andere tekens)";
$TXT_TYPE{D} = "Bestandstype D: Vast aantal cijfers (= rec.nr) en verdere willekeurig aantal letters/cijfers/tekens";
$TXT_TYPE{E} = "Bestandstype E: Willekeurig aantal letters/cijfers/tekens, al dan niet in submappen";


#########################################################################################################################
$FILE_TYPE = "jpg|bmp|tif+|gif|jpeg|png|psd|pdf|jfif";


#########################################################################################################################
#### Volgende 4 regels i.v.m. nieuwe versie Perl2Exe 16.00-win (05-09-2013)
#perl2exe_include "utf8.pm";
#perl2exe_include "unicore\Heavy.pl";
#perl2exe_include "unicore\lib\Perl\_PerlIDS.pl";
#perl2exe_include "overloading.pm";


#########################################################################################################################
## Laad en compileer bepaalde syseem Perl modulen
#########################################################################################################################
use Net::FTP;  ## download libnet-1.22_01.tar.gz (http://search.cpan.org/~gbarr/libnet-1.22/)
               ## zie ook: 
               ## http://perldoc.perl.org/Net/FTP.html
               ## http://aplawrence.com/Unixart/perlnetftp.html 
               ## http://www.perlmonks.org/?node_id=37971
               ## Alternatieve ftp: http://www.ncftp.com/ 

use Term::ReadKey;
#if (!(-d "/home")) {              ## Linux : Z: /home (skip de schermaansturingen; geven foutmeldingen m.b.t. ANSI.dll)
  use Win32::Console::ANSI;   ## http://search.cpan.org/~jlmorel/Win32-Console-ANSI-1.04/lib/Win32/Console/ANSI.pm
  use Term::ANSIColor;        ## http://search.cpan.org/~rra/Term-ANSIColor-3.01/ANSIColor.pm
#}

use LWP::UserAgent; 
use HTTP::Headers;
use HTTP::Request::Common qw(GET);

use File::Find;
use File::Copy;  

use GD;                      ## i.v.m. functie: getBounds() 


###############################################################################################
$SIG{"INT"} = "interrupt";          ## catch the INTerrupt signal ctrl-C
                                    ## http://www.perlmonks.org/?node_id=73355 
$SIG{"KILL"}  = "interrupt";
$SIG{"ABRT"}  = "interrupt";
$SIG{"QUIT"}  = "interrupt";
$SIG{"BREAK"} = "interrupt";
$SIG{"STOP"}  = "interrupt";

#foreach $tmp (keys(%SIG)){
#  print ("==$tmp : $SIG{$tmp}==\n");
#}

###############################################################################################
## Roep Perl module aan met alle ZCBS-instellingsgegevens
###############################################################################################
#perl2exe_include "../instelling.pm";
#require "instelling.pm";        ## perl module met ZCBS-instellingsgegevens
###############################################################################################
#### De module instelling.pm bevat:
#### 1. instellingsgegevens : naam+username+hostprovider+applicaties
#### 2. sub PROVIDER        : mapnamen root ($FTPIN1) + cgi-bin ($FTPIN2) voor elke hostprovider
#### 3. sub READ_INSTELLING : inlezen + testen instellingsgegevens
#### 4. sub printcol        : print colored text
#### Via de .ini file eventueel : $INSTELLING en/of $WACHTWOORD en/of $BAT
###############################################################################################
require "c:\\data\\Sowencruyt\\imagespl\\instelling.pm";
#require "c:\\data\\Sowencruyt\\imagespl\\instelling1.pm";
#########################################################
## Start: lees bestand images.ini met afwijkende defaults
#########################################################
&INI;


############################################
##  Aanroep datum, info en versie subroutine
############################################
&DATE;
&HELP;              ## introductie tekst
&VERSION;           ## nieuwe download versie beschikbaar?

$| = 1;             ## autoflushing voor STDOUT


open (LOG, ">log-$date3.txt");
$| = 1;            ## no buffering     
print LOG ("== IMAGE.EXE     : $VERSION ($UPDATE)\n");
print LOG ("== Gestart op    : $date9\n");
$itime = times();
print LOG ("== Proces tijd   : $itime\n");


#########################
##  Bepaal de huidige map
#########################
use Cwd;
$ROOT = cwd;
$ROOT =~ s|/|\\|g;
print ("\n- Huidige map is: $ROOT\n");


####################################
##  images.pm met INSERT's aanwezig?
####################################
if (-f "images.pm"){
  printcol (3, "\n> Bestand ==images.pm== gevonden.");
  printcol (3, "\n> Dit bestand kan aanpassingen bevatten in de vorm van INSERT's.");
  printcol (3, "\n> Herbenoem of verwijder dit bestand als het niet meer nodig is!!\n");
  printcol (2, "\n> Dit bestand ==images.pm== inlezen? [J/N]\n");
  $INP = <STDIN>;
  print color 'reset'; 
  if ($INP =~ /^[YJ]/i) {
    require "images.pm"; 
    printcol (3, "\n> Bestand ==images.pm== ingelezen.");
    print color 'reset'; 
    print ("\n");
  }
}






#########################################################################################################################
## Stap A: Inlezen en bepalen type images (type ABC of DE)
#########################################################################################################################
$IMAGES = "images";            ## default naam bron images map = /images/
IMAGES:

############3############
##  Is er een map images?
#############3###########
if (-e "$IMAGES") {            ## de bron image map bestaat en is gevuld (type A, B, C) dan wel geheel leeg (type D)
  opendir (DIR, "$IMAGES");
    @abc = readdir(DIR);       ## lees alle bestanden
    @abc = grep (/\w/, @abc);  ## alleen toegestaan: a-z 0-9 - en _
  close(DIR);

###########################################################
##  Map images bevat images? ==> aanroep subroutine TYPE_ABC
###########################################################
  if (@abc > 0) {              ## type A, B en C 
    &TYPE_ABC;
  } else {                     ## geheel leeg dus (type D of E) --> waar zijn de bron images dan te vinden?
    printcol (1, "\n\n----------------------------------------------------------------------------");
    printcol (3, "\n> Opgegeven map ($IMAGES) bevat geen afbeeldingen\n");
    printcol (2, "\n> Geef de naam van de map met afbeeldingen (type D en E bestanden):\n");
    $DIR = <STDIN>;
    $DIR =~ s/\s+$//;
    print color 'reset'; 
    opendir (DIR, "$DIR");
      @abc = readdir(DIR);
      @abc = grep (/\w/, @abc);
    close(DIR);
    if (@abc < 1) {          ## ook deze map is leeg (of onjuist opgegeven)
       printcol (3, "\n> Opgegeven map ==$DIR== onjuist of bevat geen afbeeldingen");
       goto IMAGES;
    } else {                 ## bron images gevonden!
##################################################################
##  Een opgegeven map bevat images? ==> aanroep subroutine TYPE_DE
##################################################################
      &TYPE_DE; 
    }
  }
########
} else {                     ## de bron image map bestaat niet; een lege aanmaken dus
########
   mkdir ($IMAGES,"755");
   goto IMAGES;              ## opnieuw proberen
} 
########

print LOG ("== Aantal images : $images\n");
print LOG ("== Type images   : $TYPE\n");



###############################################################################################
##  PDF's of -z images (groepsfoto's) aanwezig?
###############################################################################################
foreach $line (@abc) {
  $PDF++      if ($line =~ /pdf/i); 
  $NOT_PDF++  if ($line !~ /pdf/i); 
  next if ($line !~ /(\d+)-z\.($FILE_TYPE)/i);
  $IMG  = $1;
  $EXT  = $2;
  $itmp = length($IMG);
  $img{"jpg-z|$itmp"}++  if ($EXT =~ /jpg/i);
  push (@images_z, "${IMG}-z.$EXT");
}


#############################################
##  Exit programma indien geen images aanwezig
#############################################
if (@images < 1 && @images_z < 1) {
  print (">\n De map met bron-images ($IMAGES) bevat geen $FILE_TYPE type bestanden!!");
  exit;
}



#######################################################
##  Images small/large/100pct op locale PC al aanwezig?
#######################################################
$LOG .= "-init";
foreach $tmp ("small","large","100pct") {
 opendir (DIR, $tmp);
   @tmp2 = readdir(DIR);
 closedir (DIR);
  @tmp2 = grep (/\.jpg/, @tmp2);
  $tmp2 = @tmp2;
  if ($tmp2 > 0) {                ## $tmp2 images gevonden in map $tmp
    $ic++;
    if ($ic == 1) {
      print ("\n");
      printcol (3, "ATTENTIE:");
    } 
    print ("\n- De map ==\\$tmp== op uw PC bevat reeds $tmp2 .jpg bestanden!!\n");    ## niet terzake doende oude bestanden of onlangs aangemaakt?
    @tmp2 = map (/([\w\-]+\.jpg)/,@tmp2);
    if (@tmp2 > 31) { 
      @tmp2 = @tmp2[0..30] ;
      print ("  @tmp2 ... "); 
    } else { 
      print ("  @tmp2"); 
    }
  }
}

if ($ic > 0) {
OPNIEUW:
   printcol (2, "\n\n> Toch de afgeleide images small/large/100pct opnieuw aanmaken? [J/N]\n");
   $INP = <STDIN>;
   print color 'reset'; 
   print LOG ("== B: afgeleiden : $INP\n");
   goto FTP      if ($INP =~ /^N/i);
   goto OPNIEUW  if ($INP !~ /^[YJ]/i);
}





#########################################################################################################################
## Stap B: Aanmaak afgeleide images small + large + 100pct
#########################################################################################################################

#######################
##  Irfanview aanwezig?
#######################
$LOG .= "-iv1";
 if (-e "$ROOT\\i_view32.exe") {
  $icopy = 0;
} elsif ($IRFANVIEW =~ /\w+/) {                                                  ## path in images.ini  
  @abc = `copy "$IRFANVIEW" i_view32.exe`;
  $icopy = 1;
} elsif (-e "c:\\Program Files\\Irfanview\\i_view32.exe") {
  @abc = `copy c:\\"Program Files"\\Irfanview\\i_view32.exe i_view32.exe`;
  $icopy = 1;
} elsif (-e 'c:\Program Files (x86)\Irfanview\i_view32.exe') {
  @abc = `copy c:\\"Program Files (x86)"\\Irfanview\\i_view32.exe i_view32.exe`;
  $icopy = 1;
} elsif (-e 'c:\Program Files (x86)\Irfanview4.34\i_view32.exe') {               ## Willem Kappe (#46)
  @abc = `copy c:\\"Program Files (x86)"\\Irfanview4.34\\i_view32.exe i_view32.exe`;
  $icopy = 1;
} else { 
  printcol (3, "> Irfanview programma NIET GEVONDEN <=====\n");
  printcol (3, "> Neem contact op met: info\@zcbs.nl <=====\n");
  goto EXIT;
}

#################################################
##  Exit programma indien geen Irfanview aanwezig
#################################################
if (!(-e "i_view32.exe")) {
print ("==@abc==\n");
  printcol (3, "> Irfanview programma NIET GEVONDEN <=====\n");
  printcol (3, "> Neem contact op met: info\@zcbs.nl <=====\n");
  goto EXIT;
}



#####################################
##  Resolutie 100pct images beperken?
#####################################
RESOLUTIE:
printcol (1, "\n\n----------------------------------------------------------------------------\n");
print ("- Resoluties voor aan te maken afgeleide afbeeldingen van de type $TYPE images?\n");
print ("  ---------------------------------------------------------------- \n");
print ("  1 = small: 100x100  -  large: 700x500  -  100pct: ongewijzigd \n");
print ("  2 = small: 100x100  -  large: 700x500  -  100pct: max. 3000-2000 \n");
print ("  3 = small: 100x100  -  large: 700x500  -  100pct: max. 4000-3000 \n");
print ("  ---------------------------------------------------------------- \n");
print ("  6 = small: 250x250  -  large: 700x500  -  100pct: ongewijzigd \n");
print ("  7 = small: 250x250  -  large: 700x500  -  100pct: max. 3000-2000 \n");
print ("  8 = small: 250x250  -  large: 700x500  -  100pct: max. 4000-3000 \n");
print ("  ---------------------------------------------------------------- \n");
printcol (2, "  Kies  1,2,3 (objecten,boeken,etc),  of kies  6,7,8 (foto's,etc)\n");
$INP = <STDIN>;
print color 'reset'; 
print LOG ("== Keuze res.    : $INP\n");

if ($INP == 1) {
  $RESOLUTIES = "100,100";   $RESH1 = 0;     $RESH2 = 0;
} elsif ($INP == 2) { 
  $RESOLUTIES = "100,100";   $RESH1 = 3000;  $RESH2 = 2000;
} elsif ($INP == 3) { 
  $RESOLUTIES = "100,100";   $RESH1 = 4000;  $RESH2 = 3000;
} elsif ($INP == 6) { 
  $RESOLUTIES = "250,250";   $RESH1 = 0;     $RESH2 = 0;
} elsif ($INP == 7) { 
  $RESOLUTIES = "250,250";   $RESH1 = 3000;  $RESH2 = 2000;
} elsif ($INP == 8) { 
  $RESOLUTIES = "250,250";   $RESH1 = 4000;  $RESH2 = 3000;
} else {
  goto RESOLUTIE;
}
($RESH1,$RESH2) = split (/,/, $RESOLUTIEH)  if ($RESOLUTIEH ne "");


$abc = rmdir("small");
$abc = rmdir("large");
$abc = rmdir("100pct");


################################################
##  Verwerking images (@images) m.b.v. Irfanview
################################################
print ("\n- ");
$LOG .= "-iv2";
$ii="";
$images = @images;
foreach $img (@images) {
  ($IMG,$EXT) = split(/\./, $img);
  $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=($RESOLUTIES) /aspectratio /resample /jpgq=60 /convert="$ROOT\\small\\$IMG.jpg"`;
# $abc = `i_view32.exe "$ROOT\\small\\$IMG.jpg" /jpgq=60  /convert="$ROOT\\small\\$IMG.jpg"`;
  $ii++;
  print ("\e[s$ii (van de $images) images via Irfanview omgezet en geplaatst in submap: \\small\e[u");   ## save+restore cursor position
}

print ("\n- ");  
$ii="";
foreach $img (@images) {
  ($IMG,$EXT) = split(/\./, $img);
  $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=(700,500) /aspectratio /resample /jpgq=60 /convert="$ROOT\\large\\$IMG.jpg"`;
# $abc = `i_view32.exe "$ROOT\\large\\$IMG.jpg" /jpgq=60 /convert="$ROOT\\large\\$IMG.jpg"`;
  $ii++;
  print ("\e[s$ii (van de $images) images via Irfanview omgezet en geplaatst in submap: \\large\e[u"); 
}

print ("\n- ") if (@images_z > 0);  
$ii="";
foreach $img (@images_z) {
  ($IMG,$EXT) = split(/\./, $img);
  $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=(700,500) /aspectratio /resample /jpgq=60 /convert="$ROOT\\large\\$IMG.jpg"`;
# $abc = `i_view32.exe "$ROOT\\large\\$IMG.jpg" /jpgq=60 /convert="$ROOT\\large\\$IMG.jpg"`;
  $ii++;
  print ("\e[s$ii 'nummer-image(s)' via Irfanview omgezet en geplaatst in submap: \\large\e[u"); 
}

###############################
##  Downsizing de 100pct images
###############################
print ("\n- "); 
$LOG .= "-iv3";
$ii="";
if ($RESH1 == 0  && $RESH2 == 0 ) {
  foreach $img (@images) {
    ($IMG,$EXT) = split(/\./, $img);
    $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=($RESH1,$RESH2) /aspectratio /resample /jpgq=60 /convert="$ROOT\\100pct\\$IMG.jpg"`;
    $ii++;
    print ("\e[s$ii (van de $images) images via Irfanview omgezet en geplaatst in submap: \\100pct\e[u"); 
   } 
########
} else {
########
  foreach $img (@images) {
    ($IMG,$EXT) = split(/\./, $img);
    $OBJECT = GD::Image->newFromJpeg("$ROOT\\$IMAGES\\$img");
    ($w,$h)=$OBJECT->getBounds();
    if ($w > $RESH1 || $h > $RESH2) {               ## downsizing image?          
      $ratio = $w/$h;
      if ($ratio > $RESH1/$RESH2) {                 
        $resh1 = int($RESH1);
        $resh2 = int(($RESH1/$w) * $h);
      } else {                                      
        $resh2 = int($RESH2);
        $resh1 = int(($RESH2/$h) * $w);
      }
      $TXT_RESIZE .= "    image $img : downsized van $w,$h ---> $resh1,$resh2\n";
      $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=($resh1,$resh2) /aspectratio /resample /jpgq=60 /convert="$ROOT\\100pct\\$IMG.jpg"`; 
      $ii++;
      print ("\e[s$ii (van de $images) images via Irfanview omgezet en geplaatst in submap: \\100pct\e[u"); 
    } else {
      $abc = `i_view32.exe "$ROOT\\$IMAGES\\$img" /resize=($RESH1,$RESH2)  /aspectratio /resample /jpgq=60 /convert="$ROOT\\100pct\\$IMG.jpg"`; 
      $ii++;
      print ("\e[s$ii (van de $images) images via Irfanview omgezet en geplaatst in submap: \\100pct\e[u"); 
    }
  }## end foreach 
}

print ("$TXT_RESIZE")  if ($TXT_RESIZE =~ /\w/);


###################################
$abc = unlink ("i_view32.ini");
$abc = unlink ("i_view32.exe") if ($icopy ==1);










#########################################################################################################################
## Stap C: Upload images naar webserver
#########################################################################################################################
$LOG .= "-B";
FTP:
###############################################################################################
printcol (1, "\n\n\n----------------------------------------------------------------------------");
printcol (2, "\n> UPLOADEN aangemaakte images in small/large/100pct naar webserver? [J/N]\n");
###############################################################################################
$INP = <STDIN>;
print color 'reset'; 
goto REC  if ($INP =~ /^N/i);
goto FTP  if ($INP !~ /^[YJ]/i);

print LOG ("\n\n======================================================\n");
print LOG ("== Upload web    : $INP\n");
$itime = times();
print LOG ("== Proces tijd   : $itime\n");


#############################################
##  Prompt en ophalen eigen webservergegevens
#############################################

#########################################################################################################################
READ_INSTELLING:
&READ_INSTELLING;                                              ##  $INST_NR+$PROVIDER+$CODE+$HOST+$UN+$INST_NAME+$APPL...      
#########################################################################################################################



###############################################################################################
$LOG .= "-ftp1";
$INIT_FTP++;
if ($DEBUG == 0) {                                      ## genereer log/debug file
  *Net::Cmd::debug_print = sub {
           my ($self, $dir, $text) = @_;
#          $log_buffer .= ($dir ? 'snd --> ' : 'rcv <-- ') . $text;
           $text =~ s/PASS (\w+)/ PASS *******/;        ## verwijder password uit log file
           $itime = times();
           print LOG $itime . " : " . ($dir ? 'snd --> ' : 'rcv <-- ') . $text;
        };
# open (LOG, ">log-$date3.txt");
print LOG ("@LOG\n\n");    ## TIJDELIJK =======================================================
# select('LOG');
  $| = 1;                                                ## geen buffering LOG file 
}

#####################################
##  Maak ftp-verbing met de webserver
#####################################
$ftp=Net::FTP->new($HOST,Timeout=>300,Passive=>1,Debug=>1) or $ERROR=1;
  if ($ERROR > 0) {
    $ERROR = 0;
    print ("==ERROR== Kan geen verbinding krijgen met de hostprovider.\n");
    print ("==ERROR== Probeer het later opnieuw.\n");
    goto END;
  }

$ftp->login($UN,$PW) or $ERROR=1;
  if ($ERROR > 0) {
    print ("==ERROR== Onjuist wachtwoord opgegeven!\n\n");
    $ERROR = 0;
    $INSTELLING = "";
    $WACHTWOORD = ""; 
    $INST = $PW = "";
    goto READ_INSTELLING;
  }

print LOG ("\n\n======================================================\n");



#################################
##  Ophalen webserver maplocaties
#################################
&PROVIDER;                               ## input: $PROVIDER; output: $FTPIN1 en $FTPIN2


#############################
##  Beschikbare toepassingen?
#############################
$APPL = "";                            ## TEST 07-07-2018: niet meer afh. van instelling1.pm !!!
if ($APPL !~ /\w/  || $APPL =~ /;/) {    ## $APPL veld is leeg of bevat meerdere ZCBS-toepassingsnamen
  if ($APPL !~ /\w/) {                   ## geen applicaties bekend --> zoek op webserver naar applicaties
    @tmp = $ftp->dir("$FTPIN2/");        ## $FTPIN2 = /cgi-bin map pramos $FTPIN2 in $FTPIN2
    foreach $tmp (@tmp) {                   
      next if ($tmp !~ /^d/);                         ## geen regel drwxr-xr-x (= directory)
      @tmpp = split (/\s+/, $tmp);
      $appl = $tmpp[$#tmpp];                          ## laatste woord op dir listing regel is mogelijke naam beeldbank map
      next if ($appl !~ /^\w+/);                      ## geen mapnaam
      @dir_misc = $ftp->dir("$FTPIN2/$appl/misc/");   ## $ftp->size is not working !! pramos $FTPIN2 in $FTPIN2
      if (grep (/cfg-cbs.pl/, @dir_misc)) {           ## is er een config file in de map cgi-bin/[appl]/misc/ ?
        $APPL = $APPL . ";$appl";
      }
    }
    $APPL =~ s/^;//;
  }
  $APPLICATS = $APPL;
  $APPLICATS =~ s/;/\n- /g; 
  print("\n\n> Beschikbare ZCBS-toepassingen:\n- $APPLICATS"); 
  if ($APPL =~ /;/) {     ## er zijn meerdere beeldbanken
APPL:
    printcol (2, "\n\n> Kies de ZCBS-toepassing (= tevens naam van de uploadmap op de webserver):\n");
    $APPL = <STDIN>;
    print color 'reset'; 
    $APPL =~ s/\s+$//;
    goto APPL  if ($APPLICATS !~ /\b$APPL\b/);
  } 
########
} else {
########
  print("\n> ZCBS-toepassing:  $APPL\n"); 
}




# ##############################################################################
# ## Accumulate log info naar webserver /cgi-bin/misc/backup.log
# ##############################################################################
# # if (!(-d "f:/zm/" || -d "d:/zm/")  || $INST_NR eq "01") {          ## NIET een log van werkzaamheden Gerard van Nes
# if ($ENV{"path"} =~ /e:\\zcbs\\software/ && $ENV{"path"} =~ /perl2exe/) {  ## bij Gerard van Nes op PC1 / notebook
#    ## do nothing
# } else { 
#   $run_info = "$date1|images.exe|$VERSION|$VERSION2|$UPDATE|$APPL|$images\n";   ## log deze run op de webserver zelf
#   open (OUT, ">backup.log");                                       ## tijdelijk bestand
#     print OUT ("$run_info");
#   close (OUT);
#   $ftp->cwd("/$FTPIN2/misc/");   
#   $ftp->append("backup.log"); 
#   unlink ("backup.log");
# }




#########################################################
##  Welke image bestanden staan er reeds op de webserver?
#########################################################
@dir_s = $ftp->dir("$FTPIN1/$APPL/small/");        ## geeft b.v.: drwxr-xr-x  2 964   krook21   20480 Dec 28 16:09   00   (en 01, 02, ...)
@dir_l = $ftp->dir("$FTPIN1/$APPL/large/"); 
@dir_h = $ftp->dir("$FTPIN2/$APPL/100pct/"); # 

#### indien de map in de root leeg is, geef de regel =$ftp->ls= de foutmelding: PERL2EXE_STORAGE/Net/FTP/dataconn.pm line 54, <STDIN> line 5 <====
@ls_s  = $ftp->ls("$FTPIN1/$APPL/small/*")   if (@dir_s > 2);  ## geeft lijst met dir en alle image bestanden op webserver
if (@ls_s < 50000) {                  ## bij 80.000 imagebestanden/regels (= 3.4Mbyte) kost het ca. 5 minuten doorlooptijd per ls !!
  @ls_l  = $ftp->ls("$FTPIN1/$APPL/large/*")   if (@dir_l > 2); 
  @ls_h  = $ftp->ls("$FTPIN2/$APPL/100pct/*")  if (@dir_h > 2);  
}

#######################################################################################
#### let op dat het resultaat van $ftp->ls afhankelijk is van de hostprovider / webserver
#### bijvoorbeeld:
#### 1eurohosting.nl: /public_html/fotoalbum/small/schagerbrug/sb03016.jpg
#### web-oke.nl     : /public_html/beeldbank/small/05: en op volgende regels de afzonderlijke bestanden.

if ($ls_s[0] !~ /\w/  || $ls_s[0] !~ /\//) {     ## eerste ls regel een blanco regel of geen dir path (b.v. bij web-oke.nl)
  @tmp = split (/ +/, $dir_s[0]);  
  $map_naam =  @tmp[$#tmp];                      ## naam eerste map
  foreach $tmp (@ls_s,@ls_l,@ls_h) { 
    if ($tmp =~ /:/){
      $map_naam = $tmp;
      $map_naam =~ s/://; 
    }
    $tmp = $map_naam . "/$tmp"; 
  }
}
@ls_s = grep (/\.jpg/, @ls_s);      ## array met alleen de .jpg bestanden
@ls_l = grep (/\.jpg/, @ls_l);      ## array met alleen de .jpg bestanden
@ls_h = grep (/\.jpg/, @ls_h);      ## array met alleen de .jpg bestanden


# Testing 18-02-2014:
#open (XXX, ">prut.lst");
#$prut1 = join ("\n", @dir_s);
#$prut2 = join ("\n", @ls_s);
#print XXX ("==1==$prut1\n\n");
#print XXX ("==2==$prut2");

###################################
@dir   = grep ( /drwx/, @dir_l);     ## directories
@jpg_s = grep ( /\.jpg/, @dir_s);    ## .jpg files
@jpg_l = grep ( /\.jpg/, @dir_l);    ## .jpg files
@jpg_h = grep ( /\.jpg/, @dir_h);    ## .jpg files
# @digits = map ( /\d{$idigits}.jpg/, @jpg_s);   ## Klopt het aantal cijfers in image naam? 

$dir = @dir;
$jpg_s = @jpg_s;
$jpg_l = @jpg_l;
$jpg_h = @jpg_h;
$ii = 0;

foreach $tmp (@dir) {
  @tmp = split (/ +/, $tmp);     ## splitsen van: drwxr-xr-x  2 964   krook21   20480 Dec 28 16:09   00
  if ($tmp[$#tmp] =~ /\w+/){     ## laatste element in regel is sub-directory name 
    $ii++;
    $tmp[$#tmp]  =~ s/\s+$//;
    $aantal_s = grep(/\b$tmp[$#tmp]\b/, @ls_s);
    $aantal_l = grep(/\b$tmp[$#tmp]\b/, @ls_l);
    $aantal_h = grep(/\b$tmp[$#tmp]\b/, @ls_h);
    $aantal = "$aantal_s-$aantal_l-$aantal_h";
    push (@DIR, " $ii. : $tmp[$#tmp] ($aantal images)\n");
  }
}
$idir = @DIR;


###############################################################################################
printcol (1, "\n\n----------------------------------------------------------------------------\n");

###################################
if ($dir == 0 || $idir == 0) {            ## geen submappen in small/large/100pct map (alleen de . en ..)
###################################
  print ("- De webserver map ==$FTPIN1/$APPL/.../== bevat:\n  \e[7m $jpg_s-$jpg_l-$jpg_h images         [... = resp. small-large-100pct]\e[0m\n");
  print ("  Er zijn geen submappen\n\n");
  printcol (2, ">Geef een ENTER/RETURN  of indien images naar een nieuwe submap moeten, de naam van deze submap\n");
  $SUBMAP = <STDIN>;
  print color 'reset'; 
  if ($SUBMAP =~ /\w/) {
    $SUBMAP =~ s/\s+$//;
    $SUBMAP = "/" . lc($SUBMAP);
    $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/small/$SUBMAP");     ## maak de submap aan
    $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/large/$SUBMAP");     ## maak de submap aan
    $MKDIR = $ftp->mkdir("$FTPIN2/$APPL/100pct/$SUBMAP");    ## maak de submap aan  
  } else {
    $SUBMAP = "";                                            ## mocht er een 'vreemd' teken zijn ingevoerd...
  }

###################################
} elsif ($dir > 0 || $jpg_l > 0 ) {                          ## meer dan alleen . en .. als dirs; wel .jpg files?
###################################
  print ("- de webserver map ==$FTPIN1/$APPL/.../== bevat:\n       de root:\n");
  print ("\e[7m  0. : $jpg_s-$jpg_l-$jpg_h images         [... = small-large-100pct]\e[0m\n");

  print ("       en de submappen:\n\e[7m @DIR\e[0m\n");


###########################################
##  Waar moeten de images geplaatst worden?
###########################################
submap:
    printcol (2, "> Waar wilt u de images geuploaded hebben (kies 0-$ii)?\n");
    printcol (2, "  ==of==\n");
    printcol (2, "  Images naar een nieuwe submap? ==Geef dan alleen een enter/return==\n");
    $keuze = <STDIN>;
    print color 'reset'; 
    $keuze =~ s/\s+$//;

    if ($keuze =~ /^xxx/i) {                                   ## splitsen in duizentallen-map?
       $submap = $keuze;
    } elsif ($keuze eq "") {
      printcol (2, "> Geef de naam van de nieuwe submap\n");
      $keuze = <STDIN>;
      print color 'reset'; 
      $keuze =~ s/\s+$//;
        if ($keuze =~ /\w/) {                                   ## 
          $SUBMAP = "/" . lc($keuze);
          $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/small/$SUBMAP");  ## maak de submap aan
          $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/large/$SUBMAP");  ## maak de submap aan
          $MKDIR = $ftp->mkdir("$FTPIN2/$APPL/100pct/$SUBMAP"); ## maak de submap aan  
        } else {
          goto submap;  
        } 
     } elsif (grep(/$keuze/, (0..$ii))) {                       ## een bestaande (sub)map 0..n ? 
        if ($keuze == 0) {                                      ## ROOT gekozen 
          $SUBMAP = "";
        } else {                                                ## SUBMAP gekozen
          ($prut,$SUBMAP) = split(/\s*:\s*/,  $DIR[$keuze-1]);
          ($SUBMAP,$prut) = split(/\s*\(/,  $SUBMAP);
          $SUBMAP = "/" . $SUBMAP;
        }
     } else {                                                   ## onjuiste invoer? 
       goto submap;
     }

###################################
} else {
###################################
  printcol (3, "==ERROR== Mogelijk een onjuist wachtwoord opgegeven?\n");
  goto END;
}
###################################



#############################################
##  Check op overschrijving bestaande images:
#############################################
foreach $img (@images) {
  $itmp++;
  $txt = "";
  @found_s = grep (/$SUBMAP\/$img/, @ls_s);
  @found_l = grep (/$SUBMAP\/$img/, @ls_l);
  @found_h = grep (/$SUBMAP\/$img/, @ls_h);
  $txt  = "small"   if ($found_s[0]);
  $txt .= "+large"  if ($found_l[0]);
  $txt .= "+100pct" if ($found_h[0]);
  $txt  =~ s/^\+//;
  if ($txt ne "") {
    push (@ERROR, "- Voor images in ==$APPL$SUBMAP== geldt:\n") if ($itmp == 1);
    push (@ERROR, "  image ==[$txt]/$img== bestaat al op de webserver!!\n");
  }
}

if (@ERROR > 0) {
  print ("\n @ERROR");
AGAIN:
  printcol (2, "\n> Oude images (met dezelfde naam) in small/large/100pct op webserver OVERSCHRIJVEN? [J/N]\n");  
  $INP = <STDIN>;
  print color 'reset'; 
  goto REC    if ($INP =~ /^N/i);
  goto AGAIN  if ($INP !~ /^[YJ]/i);
}


##########################################
##  Upload/ftp small, large, 100pct images
##########################################
$LOG .= "-ftp2";
$ftp->binary();

foreach $IMAGE_MAP ("small", "large", "100pct") {
  print ("\n- ");
  print LOG ("\n\n===============upload $IMAGE_MAP images====================\n");
  $itime = times();
  print LOG ("== Proces tijd   : $itime\n");
  
  $ii = "";
  opendir (DIR, "$IMAGE_MAP");
    while ($file = readdir(DIR)) {
      next if ($file !~ /\.jpg/);
      $file_pc = $file;
  ##################
      eval($INSERTF) if ($INSERTF ne "");   ## eventuele individuele aanpassing up te loaden image file
  ##################
      $ii++;
      if ($submap =~ /^xxx/) {
         ($SUBMAP,$prut) = split(/\./, $file_pc);                      ## 0003810.jpg --> 0003810 
         $SUBMAP = substr($SUBMAP, -5,2);                              ## 0003810 --> 03 
         if (!grep(/\b$SUBMAP\b/, @DIR) && $IMAGE_MAP eq "small") {    ## bestaat de betreffende submap?     
           $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/small/$SUBMAP");        ## maak de submap aan
           $MKDIR = $ftp->mkdir("$FTPIN1/$APPL/large/$SUBMAP"); 
           $MKDIR = $ftp->mkdir("$FTPIN2/$APPL/100pct/$SUBMAP");       # 
           push (@DIR, $SUBMAP);                                       ## submap bestaat nu 
         }
         $SUBMAP = "/" . $SUBMAP;
      }
      $FTPIN = $IMAGE_MAP eq "100pct" ? $FTPIN2 : $FTPIN1;   
      $ftp->put("$IMAGE_MAP/$file_pc","$FTPIN/$APPL/$IMAGE_MAP$SUBMAP/$file");
      print ("\e[s$ii (van de $images) images via FTP geplaatst op webserver in de map /$IMAGE_MAP$SUBMAP\e[u");   ## save+restore cursor position   
    } 
  closedir (DIR);
}

print LOG ("\n\n======================================================\n"); 











#########################################################################################################################
## Stap D: Aanmaken en upload update database
#########################################################################################################################
$LOG .= "-C";

#############################
##  Prompt aanmaken/uploaden?
#############################
REC:
#########################################################################################################################
$irecords = @irecords;               ## totaal aantal databaserecords
printcol (1, "\n\n\n----------------------------------------------------------------------------\n");
printcol (2, "> AANMAKEN en UPLOADEN van de bijbehorende $irecords nieuwe lege DATABASE RECORDS? [J/N]\n");
###############################################################################################
$INP = <STDIN>;
print color 'reset'; 
print LOG ("== Aanmaak DB    : $INP\n");
if ($INP =~ /^N/i) {                 ## goto to end of program
  if ($INIT_FTP > 0){                ## openstaande ftp-verbinding?
    &LOGGING;
    $ftp->quit
  }
  goto END;
}  
goto REC  if ($INP !~ /^[YJ]/i);


############################
##  Prompt welke toepassing?
############################
$LOG .= "-up1";
READ_INSTELLING2:
if ($INST eq "" || $PW eq "" || $HOST eq "") {
  &READ_INSTELLING;   ##  $INST_NR+$PROVIDER+$CODE+$HOST+$UN+$INST_NAME+$APPL...   
  &PROVIDER;          ##  input: $PROVIDER; output: $FTPIN1 en $FTPIN2   

  if ($APPL =~ /;/) {            ## meer dan 1 ZCBS-toepassing? Maak een keuze.
    $APPLICATS = $APPL;
    $APPLICATS =~ s/;/\n- /g; 
    print("\n\n> Beschikbare ZCBS-toepassingen:\n- $APPLICATS"); 
APPL:
    printcol (2, "\n\n> Kies de ZCBS-toepassing (= tevens naam van de uploadmap op de webserver):\n");
    $APPL = <STDIN>;
    print color 'reset'; 
    $APPL =~ s/\s+$//;
    goto APPL  if ($APPLICATS !~ /\b$APPL\b/);
  } else {
    print("\n> ZCBS-toepassing:  $APPL\n"); 
  }
}


##################################################################
if ($INIT_FTP < 1) {            ## geen openstaande ftp-verbinding
##################################################################
$INIT_FTP++;
if ($DEBUG == 0) {                                      ## genereer log/debug file
  *Net::Cmd::debug_print = sub {
           my ($self, $dir, $text) = @_;
#          $log_buffer .= ($dir ? 'snd --> ' : 'rcv <-- ') . $text;
           $text =~ s/PASS (\w+)/ PASS *******/;        ## verwijder password uit log file
           print LOG $itime . " : " . ($dir ? 'snd --> ' : 'rcv <-- ') . $text;
        };
# open (LOG, ">>log-$date3.txt");
# select('LOG');
  $| = 1;                                                ## geen buffering LOG file 
}

$ftp=Net::FTP->new($HOST,Timeout=>300,Passive=>1,Debug=>1) or $ERROR=1;
  if ($ERROR > 0) {
    $ERROR = 0;
    print ("==ERROR== Kan geen verbinding krijgen met de hostprovider.\n");
    print ("==ERROR== Probeer het later opnieuw.\n");
    goto END;
  }

$ftp->login($UN,$PW) or $ERROR=1;
  if ($ERROR > 0) {
    print ("==ERROR== Onjuist wachtwoord opgegeven!\n\n");
    $ERROR = 0;
    $INSTELLING = "";
    $WACHTWOORD = ""; 
    $INST = $PW = "";
    $ftp->quit;
    $INIT_FTP = "";
    goto READ_INSTELLING2;
  }

print LOG ("\n\n======================================================\n");
#################################################################
}
#################################################################




####################################
##  Download en lees update-database
####################################
@ls1 = $ftp->ls("$FTPIN2/$APPL");                                       ## inhoud betreffende server map   
$ftp->get("$FTPIN2/$APPL/updates.txt")  if (grep(/updates.txt/, @ls1)); ## de update database  

open (INP, "updates.txt");
  @lines2 = <INP>;
close (INP);
unlink ("updates.txt");

push (@lines,@lines2);
$iupdates = @lines2;


####################################################
##  Download en lees configuratie bestand cfg-cbs.pl
####################################################
$ftp->get("$FTPIN2/$APPL/misc/cfg-cbs.pl");            ## configuratie bestand  
 
open (INP, "cfg-cbs.pl");
  @lines = <INP>;
close (INP);
unlink ("cfg-cbs.pl");

@ls2 = $ftp->ls("$FTPIN2/misc");                       ## inhoud betreffende server map   
if (grep (/cfg-cbs.pl/, @ls2)) {                       ## global cfg file available?
 $ftp->get("$FTPIN2/misc/cfg-cbs.pl");
 open (INP, "cfg-cbs.pl");
   @lines2 = <INP>;
 close (INP);
 unlink ("cfg-cbs.pl");
 push (@lines2, @lines);
 @lines = @lines2; 
}

######################################################
##  Haal bepaalde waarden uit het configuratie bestand
######################################################
@ID1           = grep (/^\$ID1/, @lines);                 ## $ID1 = "ZCBS"
@ID2           = grep (/^\$ID2/, @lines);                 ## $ID2 = "1000"
@MAX_OBJECT    = grep (/^\$MAX_OBJECT/, @lines);          ## $MAX_OBJECT = "99999";
@LOC_IMAGE     = grep (/^\$LOC_IMAGE/, @lines);           ## $LOC_IMAGE = 15;
@VELD_CAROUSEL = grep (/^\$VELD_CAROUSEL/, @lines);       ## $VELD_CAROUSEL = 17;

@ID1           = split (/"/, $ID1[0]);
@ID2           = split (/"/, $ID2[0]);
$MAX_OBJECT    = $1    if ($MAX_OBJECT[0] =~ /=\s*"*(\d+)"*\s*;/);
$MAX_OBJECT    = 9999  if ($MAX_OBJECT !~ /\d+/);
$MAX_OBJECT_LENGTH = $MAX_OBJECT > 99 ? length($MAX_OBJECT) : $MAX_OBJECT;     ## aantal digits databasenummer

print LOG ("\n\n======================================================\n");
print LOG ("== \$FTPIN2/\$APPL : $FTPIN2/$APPL\n");
print LOG ("== \$ID1/\$ID2     : $ID1[1]/$ID2[1]\n");
print LOG ("== \$MAX_OBJECT   : $MAX_OBJECT\n");

@LOC_IMAGE = split (/=\s*/, $LOC_IMAGE[0]);
@LOC_IMAGE = split (/\s*;/, $LOC_IMAGE[1]);
$LOC_IMAGE = $LOC_IMAGE[0];
$LOC_IMAGE = 15 if ($APPL =~ /beeldbank|foto|niestadtbb/ && $LOC_IMAGE eq "");  ## Default veldnummer voor image bestandsnaam bij een fotobeeldbank (ZBBS)

@VELD_CAROUSEL = split (/=\s*/, $VELD_CAROUSEL[0]);
@VELD_CAROUSEL = split (/\s*;/, $VELD_CAROUSEL[1]);
$VELD_CAROUSEL = $VELD_CAROUSEL[0];

$itime = times();

print LOG ("== \$LOC_IMAGE    : $LOC_IMAGE\n");
print LOG ("== Proces tijd   : $itime\n");
print LOG ("======================================================\n\n");



###############################################
##  Herstel eventuele eerdere sessie images.exe
###############################################
if (-e "images-rename.txt"  &&  @IMAGE_RENAME == 0 && $TYPE =~ /C|E/) { 
  printcol (2,"\n> De eerder aangemaakte image-rename.txt bestand gebruiken? [J/N]\n");
  $INP = <STDIN>; 
  if ($INP =~ /^[YJ]/i) {
    open (INP, "images-rename.txt");
      @IMAGE_RENAME = <INP>;
    close (INP);
  }
} 


#############################
##  Submap image file bekend?
#############################
if ($SUBMAP eq "" && $LOC_IMAGE ne "") {
   printcol (2,"\n> Geef eventueel de mapnaam waarin de images staan (bijvoorbeeld: 01; anders alleen een return)\n");
   $SUBMAP = <STDIN>;
   $SUBMAP =~ s/[^\w]//g;     ## als submapnaam alleen toegestaan: [_0-9A-Za-z]
   $SUBMAP = lc($SUBMAP);
}
print color 'reset';


##############################################
##  Check lengte recordnummer in @IMAGE_RENAME
##############################################
if (@IMAGE_RENAME > 0) {                            ## @IMAGE_RENAME bevat: $name|$NUM\n"
  ($a,$b) = split(/\|/, $IMAGE_RENAME[0]);
  $b =~ s/\n//;
  if (length($b) != $MAX_OBJECT_LENGTH) {
    foreach $tmp (@IMAGE_RENAME) {
      ($a,$b) = split(/\|/, $tmp);
      $b =~ s/\n//;
      $b = &NUMBER_LENGTH($b,$MAX_OBJECT_LENGTH);
      $tmp = "$a|$b\n";
    }
    printcol (3, "\n ERROR: lengte opgegeven image bestandsnummer aangepast naar: $MAX_OBJECT_LENGTH!\n");
  }
}


#########################################################################################################################
##  Aanmaak update database
#########################################################################################################################
$LOG .= "-up2";
$im = -1;
###########################
foreach $tmp (@irecords) {                          ## @irecords bevat de nummers van de nieuwe images of de (opgegeven) database-nummers
###########################
   $tmp = &NUMBER_LENGTH($tmp,$MAX_OBJECT_LENGTH);  ## Check juiste lengte database nummer
   @FOUND = grep (/\t$veld[1]\t$tmp\t/, @lines);    ## Controle op reeds aanwezige database records; veld[1] = instituutsnummer
   if (@FOUND > 0) {                                ## Database record reeds aanwezig?
      $LAST = $FOUND[$#FOUND];                      ## Laatste record (testen op delete record)
      @dummy = split (/\t/, $LAST);
      if ($dummy[5] =~ /\w/) {                      ## Titel veld is niet leeg
        $idubbel++;
        push (@DUBBEL, "$tmp; ");
      }
      next;                                         ## Maak geen leeg database record aan
   } 
 
   if (length($tmp) != $MAX_OBJECT_LENGTH) {
     printcol (3, "\n> Database record ==$tmp== bevat geen $MAX_OBJECT_LENGTH cijfers!!"); 
     printcol (3, "\n> Dit record wordt NIET meegenomen.\n"); 
     next;
   }
 
#################################
##  Vul de database record velden
#################################
   undef (@veld);
   if (@IMAGE_RENAME > 0) {                         ## @IMAGE_RENAME bevat: $name|$NUM\n"
     @found = grep (/$tmp\n$/,@IMAGE_RENAME); 
     $veld[27] = $found[0]  if (@found == 1);
     ($veld[27],$prut) = split (/\|/, $veld[27]);   ## verwijdering |$NUM 
     $veld[8]  = $1  if($veld[27] =~ /\b(20[0-9]{2}|19[0-9]{2})\b/);    ## datering in image bestandsnaam vermeld?
     foreach $aa ("straat","weg","plein","steeg","laan","einde") {
       if($veld[27] =~ /([A-Z]*[a-z]+$aa)( *\d*)/) {  ## image bestandsnaam op PC
          $veld[14] = "$1$2";                         ## adres
          $veld[14] =~ s/\s+/ /g;                     ## some cleaning
          $veld[14] =~ s/^\s+|\s+$//g;                ## some cleaning
          $veld[14] = ucfirst($veld[14]); 
       }
    }
   } 

   $veld[0]  = $ID1[1];
   $veld[1]  = $ID2[1];
   $veld[2]  = $tmp;
   $veld[2]  =~ s/\D+//g;                             ## forceer zuivere recordnummers
   $veld[5]  = "Een nog niet beschreven record ($date)";

   if ($LOC_IMAGE ne "") {
     $image_file = $TYPE =~ /A|D/ ? $veld[2] : $veld[27];
#    $image_file =~ s/\.\w+$//;                        ## Geen .tif, .bmp, etc etc binnen filename
     $submap = $SUBMAP eq "" ? "" : "$SUBMAP/";
     $veld[$LOC_IMAGE] = "$submap$image_file.jpg";     ## veld locatie image bestand
   }

#  $veld[$VELD_CAROUSEL] = "$submap$1"  if (@images =~ /(${image_file}-p.jpg)/);  ## een eerste probeersel

   $veld[15] =~ s|^/+||;
   $veld[32] = "$date4|system"; 
   $veld[34] = "$date4|system\n"; 
################################################
##  INSERTD: aanpassingen/aanvullingen database?
################################################
   eval($INSERTD) if ($INSERTD ne "");   ## eventuele individuele aanpassing database records

   $RECORD =  join ("\t", @veld);
   push (@RECORDS, $RECORD);
##################################
}  ## einde loop over alle records
##################################

##########################################
##  Schrijf de update database records weg
##########################################
open (QWE, ">updates-add.txt");
  print QWE (@RECORDS);
close (QWE); 

$RECORDS = @RECORDS;
print ("\n");
print ("- Aangemaakt i.v.m. nieuwe images : $RECORDS records (met in titelveld: \"Een nog niet beschreven record ($date)\")\n");

###################
if ($idubbel > 0) {
  print("\nDubbele database records: @DUBBEL\n");
}



####################################################################################
##  Append de nieuw aangemaakte update database records met de webserver updates.txt
####################################################################################
$ftp->cwd("$FTPIN2/$APPL");                             ## ga naar de goede map/directory op de webserver 
$ftp->append("updates-add.txt", "updates.txt");         ## append ( LOCAL_FILE [, REMOTE_FILE ] )

#### Controle:
$ftp->get("updates.txt","updates-new.txt");             ## get ( REMOTE_FILE [, LOCAL_FILE [, WHERE]] )
open (INP, "updates-new.txt");                          ## lees de nieuwe (en aangevulde) updates.txt
  @lines = <INP>;
close (INP);
$lines = @lines;
if ($lines != $iupdates + $irecords) {
   printcol (3, "\n ERROR: niet alle aangemaakte $irecords records zijn geuploaded!\n");
   if ($iupdates == $lines) {                             ## 27-02-2014 : Berkhout : 451 updates.txt: Append/Restart not permitted
     open (NEW, ">updates-$date5.txt");
       print NEW (@lines);
       print NEW (@RECORDS);
     close (NEW);
     $ftp->put("updates-$date5.txt","updates.txt");
     $lines = $lines + $RECORDS;
     printcol (3, "\n Via een alternatieve weg is een nieuwe poging gedaan...\n");
   } 
} else {
   $UPDATE_DB = "OK";
}

print ("\n");
print ("- Oude   update database op webserver bevatte  : $iupdates records\n");
print ("- Nieuwe update database op webserver bevat nu : $lines records\n");

&LOGGING;

$ftp->quit   if ($INIT_FTP > 0);

unlink ("updates-new.txt") if (-e "updates-new.txt" && $DEBUG == 0);




###############################################################################################
@xxx = unlink ("ftpin.txt");
@ERRORS = grep(/Unable|refused/i, @xxx);
$ERRORS = @ERRORS;
if ($ERRORS > 0) {
  $TMP = " aanvullende"  if ($IERROR > 0);
  print ("\n==ERROR== $ERRORS$TMP fouten gedetecteerd tijdens het uploaden; zie de logfile\n");
  print LOG ("\n\n==ERROR== $ERRORS$TMP fouten gedetecteerd tijdens het uploaden; zie de logfile\n");
}

printcol (1, "\n\n----------------------------------------------------------------------------\n");
printcol (1, "====> Upload informatie weggeschreven naar logfile: log-$date3.txt\n");
printcol (1, "====> Natuurlijk moet u nog (via systeembeheer) nieuwe records aanmaken\n\n")  if ($UPDATE_DB) ne "OK";
printcol (0, "====> Vergeet niet om de originele images te archiveren!!\n");
printcol (1, "----------------------------------------------------------------------------\n");









#########################################################################################################################
## Stap E: Eventueel wat opruimen?
#########################################################################################################################
END:
$LOG .= "-D";
printcol (2, "\n\n> VERWIJDEREN (tijdelijk) aangemaakte mappen [small], [large] en [100pct]? [J/N]\n");
$INP = <STDIN>;
print color 'reset'; 

if ($INP =~ /^[YJ]/i) {
  foreach $img (@images) {
    $img =~ s/bmp/jpg/i; 
    $img =~ s/tif+/jpg/i; 
    $img =~ s/gif/jpg/i; 
    $img =~ s/jpeg/jpg/i; 
    $img =~ s/png/jpg/i; 
    $img =~ s/psd/jpg/i; 
    $img =~ s/pdf/jpg/i; 
    $img =~ s/jfif/jpg/i; 
    unlink ("small/$img");
    unlink ("large/$img");
    unlink ("100pct/$img");
  }

  rmdir ("small")   if (-d "small");
  rmdir ("large")   if (-d "large");
  rmdir ("100pct")  if (-d "100pct");
}

###########################
if (-e "updates-add.txt") {
  printcol (2, "\n\n> VERWIJDEREN (tijdelijk) PC-bestand met nieuwe database records? [J/N]\n");
  $INP = <STDIN>;
  print color 'reset'; 
  unlink ("updates-add.txt") if ($INP =~ /^[YJ]/i);
}


###########################
printcol (2, "\n\n> VERWIJDEREN inhoud van de map [$IMAGES] met bron images? [J/N]\n");
$INP = <STDIN>;
print color 'reset'; 

if ($INP =~ /^[YJ]/i) {
  foreach $img (@images) {
    $img =~ s/tif+/jpg/i; 
    $img =~ s/bmp/jpg/i; 
    $img =~ s/gif/jpg/i; 
    $img =~ s/jpeg/jpg/i; 
    $img =~ s/png/jpg/i; 
    $img =~ s/psd/jpg/i; 
    $img =~ s/jfif/jpg/i; 
    unlink ("$IMAGES/$img");
  }
}




###############################
##  Klaar met alles / afsluiten
###############################

close (LOG);
EXIT:
printcol (2, "\n> Geef een Return/Enter om dit DOS-window te verlaten\n");
<STDIN>;      # wait until the user presses enter key
print color 'reset'; 












#######################################################################################################################xx
sub TYPE_ABC {                                                                     ## Image bestanden van type A, B, of C
#########################################################################################################################
  local ($IMG, $EXT, $NUM, $line, $tmp);

######################################
## Tel de bestanden van type A, B en C
######################################
  foreach $line (@abc) {  
    next if ($line !~ /(.*).($FILE_TYPE)/i);
    $images++;
    $IMG = $1;
    $EXT = $2;

    if ($IMG =~ /^(\d+)$/) {
      $tmp = length($1); 
      $TYPE_A{$tmp}++;
      $TYPE_A++; 
    }
    if ($IMG =~ /(\d+)$/ ) {     ## bijvoorbeeld: HKD1234 (Diemen)
      $tmp = length($1); 
      $TYPE_B1{$tmp}++; 
      $TYPE_B1++;
      $tmp = length($`); 
      $TYPE_B1_txt{$tmp}++; 
    } 
    $tmp = length ($IMG);        ## variabele lengten bestandsnamen?
    $TYPE_C{$tmp}++;
  }


#####################################################
## Bepaal uiteindelijke type image bestand A, B of C?
#####################################################
  if (keys(%TYPE_A) == 1 && $TYPE_A == $images) {   ## allemaal getallen met dezelfde lengte
    $TYPE = "A";
  } elsif (keys(%TYPE_B1) == 1 && $TYPE_B1 == ($images) && keys(%TYPE_B1_txt) == 1 ) {
    $TYPE = "B1";
# } elsif (keys(%TYPE_B2) == 1 && $TYPE_B2 == ($images) ) {
#   $TYPE = "B2";
  } elsif (keys(%TYPE_C) > 1) {                     ## bestandsnamen met variable lengten
    $TYPE = "C";
  } else {
    $TYPE = ""; 
  }
  $TYPE = "B" if ($TYPE =~ /^B/);                   ## daar B2 nog niet geactiveerd is

READ_ABC:
  if ($IMAGE_TYPE =~ /^[ABC]$/i) {                  ## $IMAGE_TYPE bepaald in .ini file
    $tmp = $IMAGE_TYPE;
    print ("\n  Gevonden $images bestanden van OPGEGEVEN type: **** $tmp ****\n");
  } elsif ($TYPE eq "" && $images < 50) {
    print ("\n Er is geen consistentie is te vinden in de $images bestandsnamen\n");
    print (" Het programma kan zodoende niet het type imagebestanden bepalen\n");
    printcol (2, "\n> Type return om het programma af te breken of kies een van de volgende opties/letters\n");
    print color 'reset'; 
      print ("   A : $TXT_TYPE{A}\n");
      print ("   B : $TXT_TYPE{B}\n");
      print ("   C : $TXT_TYPE{C}\n");
      $tmp = <STDIN>;
      $tmp =~ s/\s+$//;
  } else {
    print ("\n  Gevonden $images bestanden in map (\\$IMAGES) van type: **** $TYPE ****\n");
#    print color 'reset'; 
#    if ($images < 50) {
      printcol (2,"\n> Type ENTER/RETURN indien OK -- of kies een van de volgende opties/letters -- of breek het programma af:\n");
      print color 'reset'; 
      print ("   A : $TXT_TYPE{A}\n");
      print ("   B : $TXT_TYPE{B}\n");
      print ("   C : $TXT_TYPE{C}\n");
      $tmp = <STDIN>;
      $tmp =~ s/\s+$//;
  }

  if ($tmp !~ /^[ABC]$/i && $TYPE eq "") { 
    exit;
  } elsif ($tmp eq "A" || $tmp eq "a") {
    $TYPE = "A";
  } elsif ($tmp eq "B" || $tmp eq "b") {
    $TYPE = "B";
  } elsif ($tmp eq "C" || $tmp eq "c") {
    $TYPE = "C";
  } elsif ($tmp ne "") {
    $TYPE = "ONBEKEND";
    goto READ_ABC;
  }


#########################################################
## Prompt om eerste recordnummer voor bestandsnaam type C
#########################################################
  if ($TYPE eq "C") {
    printcol (2, "\n> Geef het eerste nummer voor de serie van nieuwe image bestandsnamen:\n  (let daarbij op het aantal op te geven cijfers!!)\n");
    $NUM = <STDIN>;
    $NUM =~ s/\s+$//;                        ## some cleaning
    if ($NUM != 0) {                         ## eerste recordnummer nieuw image
      $MAX_OBJECT_LENGTH = length($NUM);  ## aantal digits databasenummer
    }
    print color 'reset'; 
    print ("\n");
    print LOG ("== Start Rec.nr. : $NUM\n");
  }


#########################################
## Maak tabel aan: imagenaam|recordnummer
#########################################
  foreach $line (@abc) {                               ## voor alle ingelezen image bestanden
    next if ($line !~ /(.+)\.($FILE_TYPE)/i);
    $IMG = $1;
    $EXT = $2;
    $image = lc($&);
    push (@images, $image);                            ## lijst met alle image bestandsnamen 
    next if ($line =~ /-p\.$EXT/);                     ## bij -p images horen geen eigen databaserecords   
    if ($TYPE eq "A") {
      push (@irecords, $IMG); 
   } elsif ($TYPE eq "B" && $IMG =~ /(\d+)$/) {
      push (@IMAGE_RENAME, "$IMG|$1\n"); 
      push (@irecords, $1);                            ## lijst met alle recordnummers
    } elsif ($TYPE eq "C") {
      push (@IMAGE_RENAME, "$IMG|$NUM\n"); 
      push (@irecords, $NUM);                          ## lijst met alle recordnummers
      $NUM++;                                          ## verhoog recordnummer met 1
      $NUM = &NUMBER_LENGTH($NUM,$MAX_OBJECT_LENGTH);  ## juist aantal cijfers recordnummer
    } 
  }
  
  if (@IMAGE_RENAME > 0) {
    open (OUT, ">images-rename.txt");
      print OUT (@IMAGE_RENAME);             ## oud rec.nr.|nieuw rec.nr. : opslag t.b.v. veld-27 update-database
    close (OUT);
  }

}




#########################################################################################################################
sub TYPE_DE {                                                                          ## Image bestanden van type D of E
#########################################################################################################################
  local ($IMG, $EXT, $NUM, $line, $tmp);

###################################
## Tel de bestanden van type D en E
###################################
  foreach $line (@abc) {  
    next if ($line !~ /(.*)\.($FILE_TYPE)/i);    ## geen afbeelding
    $images++;
    $IMG = $1;
    $EXT = $2;
    next if ($line =~ /-p\.$EXT/);               ## bij -p images horen geen eigen databaserecords 
  
    if ($IMG =~ /(^\d+)/ ) {                     ## bijvoorbeeld: 1000 Lichtenvoorde gemeentehuis 1900
      $tmp = length ($1); 
      $TYPE_D{$tmp}++; 
      push (@irecords_d, $&);
    } else {
      $TYPE_E++;   
    }
  }



##################################################
## Bepaal uiteindelijke type image bestand D of E?
##################################################
  if ($TYPE_E > 0) {
    $TYPE = "E";
  } elsif (keys(%TYPE_D) == 1) {
    $TYPE = "D";
  } else {
    $TYPE = ""; 
  }
  
READ_DE:
  if ($IMAGE_TYPE =~ /^[DE]$/i) {                  ## $IMAGE_TYPE bepaald in .ini file
    $tmp = $IMAGE_TYPE;
    print ("\n  Gevonden $images bestanden van OPGEGEVEN type: **** $tmp ****\n");
  } elsif ($TYPE eq "" && $images < 5) {
    print ("\nEr is geen consistentie is te vinden in de $images bestandsnamen\n");
    print ("Het programma kan zodoende niet het type imagebestanden bepalen\n");
    printcol (2, "\n> Type ENTER/RETURN om het programma af te breken of kies een van de volgende opties/letters\n");
    print color 'reset';
    print ("   D : $TXT_TYPE{D}\n");
    print ("   E : $TXT_TYPE{E}\n");
    $tmp = <STDIN>;
    $tmp =~ s/\s+$//;
  } else {
    print ("\n  Gevonden $images bestanden van type: **** $TYPE ****\n");
    printcol (2, "\n> Type ENTER/RETURN indien OK -- of kies een van de volgende opties/letters -- of breek het programma af:\n");
    print color 'reset';
    print ("   D : $TXT_TYPE{D}\n");
    print ("   E : $TXT_TYPE{E}\n");
    $tmp = <STDIN>;
    $tmp =~ s/\s+$//;
  }

  if ($tmp !~ /^[DE]$/i && $TYPE eq "" && $images < 5) { 
    exit;
  } elsif ($tmp eq "D" || $tmp eq "d") {
    $TYPE = "D";
  } elsif ($tmp eq "E" || $tmp eq "e") {
    $TYPE = "E";
  } elsif ($tmp ne "") {
    $TYPE = "ONBEKEND";
    goto READ_DE;   
  }



#########################################################
## Prompt om eerste recordnummer voor bestandsnaam type E
#########################################################
  if ($TYPE eq "E") {
    printcol (2, "\n> Geef het eerste nummer voor de serie van nieuwe image bestandsnamen:\n  (let daarbij op het aantal op te geven cijfers!!)\n");
    $NUM = <STDIN>;
    $NUM =~ s/\s+$//;                        ## some cleaning 
    if ($NUM != 0) {                         ## eerste recordnummer nieuw image
      $MAX_OBJECT_LENGTH = length($NUM);     ## aantal digits databasenummer
    }
    $RECORD = $NUM;
    print color 'reset'; 
    print ("\n");
    print LOG ("== Start Rec.nr. : $NUM\n");
  }


#########################################
## Maak tabel aan: imagenaam|recordnummer
#########################################
  if ($TYPE eq "D") {
    foreach $line (@abc) {  
      next if ($line !~ /(.*).($FILE_TYPE)/i);
      $EXT = lc($2);
      if ($line =~ /^(\d+)/) {
        push (@IMAGE_RENAME, "$line|$1\n"); 
        push (@irecords, $1);                           ## lijst met alle recordnummers
        push (@images, "$1.$EXT");                      ## lijst met alle image bestandsnamen 
        copy ("$DIR/$line", "$ROOT/$IMAGES/$1.$EXT");   ## copy image bestand van map images-org --> map images 
      } 
    }
  } elsif ($TYPE eq "E") {                   ## image bestandstype E: Willekeurige tekst, al dan niet in submappen"; 
     &find (\&wanted,$DIR);                  ## de bijbehorende subroutine ==wanted== bevat nu de gehele boom! 
  }

  if (@IMAGE_RENAME > 0) {                   ## zowel bij type D en E 
    open (OUT, ">images-rename.txt");
      print OUT (@IMAGE_RENAME);             ## oud rec.nr.|nieuw rec.nr. : opslag t.b.v. veld-27 update-database
    close (OUT);
  }

  opendir (DIR, "$IMAGES");
    @abc = readdir(DIR);                     ## lees alle bestanden, nu uit de standaard map images
  close(DIR);
  
}






#########################################################################################################################
sub wanted {                                                   ## Aangeroepen voor elke image file en elke dir in de boom
#########################################################################################################################
  return if ($_ !~ /\.($FILE_TYPE)/i);                     ## $ name bevat $dir/$_  (currentdir/file)
  $ext = "." . $1;                                         ## extentie is jpg|bmp|tif+|gif|jpeg|png|psd|pdf|jfif
  $ext = lc($ext); 

# use File::Copy;                                          ## (wordt reeds aan begin images.exe aangeroepen) of: use File::Copy qw(copy);  
  $name = "$File::Find::name";                             ## the complete pathname to the file (/some/path/01234.jpg)
                                                           ## $_ the current filename within that directory (01234.jpg)
 # push (@images, $_);                                     ## lijst met alle image bestandsnamen 
  
#################################
## Aangeroepen alleen voor type E
#################################
  if ($TYPE =~ /E/) {
    $copy_from = $name =~ /^\w:/ ? $name : "$ROOT\\$name"; ## bevat bestandsnaam een schijfaanduiding (b.v.: D:)?  
    copy ($copy_from, "$ROOT/$IMAGES/$RECORD$ext");        ## copy image bestand van map images-org --> map images 
    $iwanted++;
    print ("\e[s$iwanted afbeeldingen gekopieerd naar map: $IMAGES\e[u"); 
  }  

#########################################
## Maak tabel aan: imagenaam|recordnummer
#########################################
  $name =~ s/$DIR\///;                                     ## verwijder het algemene path gedeelte
  push (@IMAGE_RENAME, "$name|$RECORD\n");                 ## bestandsnaam|nieuw rec.nr. : opslag t.b.v. veld-27 update-database
  push (@irecords, $RECORD);                               ## lijst met alle recordnummers
  push (@images, "$RECORD$ext");                           ## lijst met alle nieuwe image bestandsnamen 
 
  $RECORD++;
  $RECORD = &NUMBER_LENGTH($RECORD,$MAX_OBJECT_LENGTH);
 
}





#########################################################################################################################
 sub kanweg_ERROR {                                                                       ## deze kan worden verwijderd??
#########################################################################################################################
  @ok = grep (/226 Transfer complete|226 File receive OK|successfully transferred/, @tmp);
  $ok = $images - @ok;
  if ($ok > 0) {
    printcol (3, "==ERROR== geen (volledige) upload van $ok images; zie de logfile\n");
  }
  $IERROR++;
}





#########################################################################################################################
sub interrupt {                                                                                     ## Interrupt handlers
#########################################################################################################################
## Verwijderen tijdelijke bestanden
   unlink ("i_view32.exe")   if ($icopy == 1);
   unlink ("i_view32.ini")   if ($icopy == 1);
   unlink ("ftpin.txt");
   printcol (3, "\n\nProgramma images.pl voortijdig beeindigd door de gebruiker!\n");
   exit;  # That's what the user finally wants
}





#########################################################################################################################
sub NUMBER_LENGTH {                                                           ## Set aantal digits object/database number
#########################################################################################################################
## Formateer databasenummer naar vast aantal cijfers
   local ($number,$digits) = @_;
   if ($digits == 2) {
      $number = "0$number"     if (length($number) == 1);
   } elsif ($digits == 3) {
      $number = "0$number"     if (length($number) == 2);
      $number = "00$number"    if (length($number) == 1);
   } elsif ($digits == 4) {
      $number = "0$number"     if (length($number) == 3);
      $number = "00$number"    if (length($number) == 2);
      $number = "000$number"   if (length($number) == 1);
   } elsif ($digits == 5) {
      $number = "0$number"     if (length($number) == 4);
      $number = "00$number"    if (length($number) == 3);
      $number = "000$number"   if (length($number) == 2);
      $number = "0000$number"  if (length($number) == 1);
   } elsif ($digits == 6) {
      $number = "0$number"     if (length($number) == 5);
      $number = "00$number"    if (length($number) == 4);
      $number = "000$number"   if (length($number) == 3);
      $number = "0000$number"  if (length($number) == 2);
      $number = "00000$number" if (length($number) == 1);
   }
   $number;
}





#########################################################################################################################
sub DATE {                                                                                            ## Datum subroutine
#########################################################################################################################
## Defineer de benodigde datumvariabelen
   my ($sec,$min,$hour,$day,$mon,$year  ,$weekday,$dayofyear,$isdst) = localtime(time);
   $year  = $year + 1900;      ## $year vanaf 1900
   $mon   = $mon + 1;          ## $mon = 0( jan) .. 11 (dec)
   $day   = "0$day"   if (length($day)==1);
   $mon   = "0$mon"   if (length($mon)==1);
   $hour  = "0$hour"  if (length($hour)==1);
   $min   = "0$min"   if (length($min)==1);
   $sec   = "0$sec"   if (length($sec)==1);
   
   $date1 = "$year$mon$day-$hour:$min";            ## 20090123-10:00
   $date3 = "$year$mon$day-$hour:$min";            ## 20090123-10:00
   $date3 = substr($date3,2);                      ## 090123-10:00 
   $date4 = $date3;
   $date3 =~ s/://;
   $date  = substr($date3,0,6);                    ## 090123  
   $date5 = $date . $hour . $min . $sec;
   $date6 = "$hour:$min" . "." . $sec;
   $date9 = "$day-$mon-$year ($date6)";
}





#########################################################################################################################
sub HELP {                                                                                           ## Introductie tekst
#########################################################################################################################
## Toon introductietekst aan begin van de images.exe sessie

local ($HELP);
$dummy = `mode 110,9999`;                         ## breedte,hoogte DOS window

$HELP= <<EOR;
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
Dit ZCBS-hulpprogramma zorgt voor het:
A. Inlezen en bepalen van de type images.
B. Automatisch aanmaken van afgeleiden afbeeldingen (small/large/100pct).
C. Uploaden via ftp van deze images naar de webserver.
D. Aanmaken van de bijbehorende database records.

Documentatie:
Zie: www.zcbs.nl/docs/manual-images.pdf

\e[31;47;1m==>\e[0;33m Vergeet niet om na afloop de originele afbeeldingen op te slaan!  

-------------------------------------------------------------------------------
Versie $VERSION ($UPDATE) -- $VERSION2    Info: Gerard van Nes (vannes\@zcbs.nl)
-------------------------------------------------------------------------------
EOR
printcol (1, $HELP);

}





#########################################################################################################################
sub VERSION {                                                                      ## Nieuwe download versie beschikbaar?
#########################################################################################################################
## Haal via de Perl-module LWP bestand downloads.txt op van de webserver
   $ua = LWP::UserAgent->new;                                ## Define user agent (web client) 
   $ua->agent('Mozilla/8.0');                                ## Define user agent type
   $req = GET "http://www.zcbs.nl/cgi-bin/misc/downloads.txt";  ## Request object  <=================================== geen 755 uitvoering!!!  Werkt dit wel?? 17-09-2016 FOUT in ERROR DA! 
   $res    = $ua->request($req);                             ## Make the request
   $content = $res->content; 
   @content = split (/\n/, $content);                        ## Naam | versie | datum |
   
## Welk versienummer van images.exe is vermeld in downloads.txt?
   @tmp = grep (/images/, @content);
   ($prut,$versie,$datum) = split (/\s*\|\s*/, $tmp[0]);
   $versie =~ s/[A-Za-z]//g;
   
## Geeft melding aan gebruiker als er een nieuwe versie beschikbaar is
   if ($versie > $VERSION) {                                 ## nieuwe versie beschikbaar?
      printcol (1, "\n\e[1m==> Er is een nieuwe versie van dit programma beschikbaar!\n");
      printcol (1, "    Versie: $versie (van: $datum)\n");
      printcol (1, "    Ga naar Systeembeheerknop op de ZCBS/ZBBS homepage\n");
      printcol (1, "    en vervolgens onderaan: Beschikbare interne/systeem ZCBS-programma's\n");
      printcol (1, "----------------------------------------------------------------------------\n");
   }
}





#########################################################################################################################
sub LOGGING {                                                                                     ## Logging image upload
#########################################################################################################################
## Schrijf een log-regel naar bestand /cgi-bin/misc/images.log

# return if ($ENV{"path"} =~ /e:\\zcbs\\software/ && $ENV{"path"} =~ /perl2exe/) {  ## bij Gerard van Nes op PC1 / notebook
   $tmp = "$date1|images.exe|$VERSION|$VERSION2|$UPDATE|$APPL|$images|$TYPE|$LOG|$ENV{\"USERNAME\"}\n";   ## log deze run op de webserver zelf
   open (OUT, ">images.log");                                       ## tijdelijk bestand op PC
     print OUT ("$tmp");
   close (OUT);
   $ftp->cwd("/$FTPIN2/misc/");   
   $ftp->append("images.log"); 
   unlink ("images.log");
}

#########################################################################################################################
#########################################################################################################################


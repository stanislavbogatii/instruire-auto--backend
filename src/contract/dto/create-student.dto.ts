import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  nume: string;

  @IsNotEmpty()
  @IsString()
  prenume: string;

  @IsNotEmpty()
  @IsString()
  cetatenia: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  raion: string;

  @IsNotEmpty()
  @IsString()
  localitate: string;

  @IsNotEmpty()
  @IsString()
  strada: string;

  @IsNotEmpty()
  @IsString()
  numar: string;

  @IsNotEmpty()
  @IsString()
  apartament: string;

  @IsNotEmpty()
  @IsString()
  serieActIdentitate: string;

  @IsNotEmpty()
  @IsString()
  numarActIdentitate: string;

  @IsNotEmpty()
  @IsString()
  eliberatDe: string;

  @IsNotEmpty()
  @IsString()
  dataEliberare: string; 

  @IsNotEmpty()
  @IsString()
  dataNasterii: string; 

  @IsNotEmpty()
  @IsEnum(['M', 'F'])
  sex: 'M' | 'F';

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'IDNP trebuie să conțină exact 13 cifre' })
  idnp: string;

  @IsNotEmpty()
  @IsString()
  telefon: string;

  @IsNotEmpty()
  @IsString()
  telefonContact: string;

  @IsNotEmpty()
  @IsEnum(['MECANICĂ', 'AUTOMATĂ'])
  cutie: 'MECANICĂ' | 'AUTOMATĂ';

  @IsNotEmpty()
  @IsString()
  deUndeAflat: string;
}
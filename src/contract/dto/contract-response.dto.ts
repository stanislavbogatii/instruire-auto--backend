import { ApiProperty } from '@nestjs/swagger';

export class ContractDataDto {
  @ApiProperty({
    description: 'Numărul unic al contractului generat',
    example: '20251103-456'
  })
  contractNumber: string;

  @ApiProperty({
    description: 'Adresa de email unde au fost trimise contractele',
    example: 'ion.popescu@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Numele complet al studentului',
    example: 'Ion Popescu'
  })
  studentName: string;

  @ApiProperty({
    description: 'Data contractului în format DD.MM.YYYY',
    example: '03.11.2025'
  })
  contractDate: string;
}

export class ContractGeneratedResponseDto {
  @ApiProperty({
    description: 'Status-ul operațiunii',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Mesaj descriptiv despre rezultatul operațiunii',
    example: 'Documentele au fost generate și trimise cu succes'
  })
  message: string;

  @ApiProperty({
    description: 'Datele despre contractul generat',
    type: ContractDataDto
  })
  data: ContractDataDto;
}

export class ContractPreviewDataDto {
  @ApiProperty({
    description: 'Numărul unic al contractului generat',
    example: '20251103-789'
  })
  contractNumber: string;

  @ApiProperty({
    description: 'Cererea de înscriere în format Base64',
    example: 'JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZS...'
  })
  applicationPDF: string;

  @ApiProperty({
    description: 'Contractul de prestări servicii în format Base64',
    example: 'JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZS...'
  })
  contractPDF: string;
}

export class ContractPreviewResponseDto {
  @ApiProperty({
    description: 'Status-ul operațiunii',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Mesaj descriptiv despre rezultatul operațiunii',
    example: 'Documentele au fost generate cu succes'
  })
  message: string;

  @ApiProperty({
    description: 'Datele despre contractul generat (Base64)',
    type: ContractPreviewDataDto
  })
  data: ContractPreviewDataDto;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Status-ul operațiunii (false pentru erori)',
    example: false,
    required: false
  })
  success?: boolean;

  @ApiProperty({
    description: 'Codul de status HTTP',
    example: 400,
    required: false
  })
  statusCode?: number;

  @ApiProperty({
    description: 'Mesajul de eroare sau array de mesaje de validare',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ],
    example: 'A apărut o eroare la generarea documentelor'
  })
  message: string | string[];

  @ApiProperty({
    description: 'Tipul erorii',
    example: 'Bad Request',
    required: false
  })
  error?: string;
}
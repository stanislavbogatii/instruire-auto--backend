import { 
  Body, 
  Controller, 
  Post, 
  HttpException, 
  HttpStatus,
  HttpCode 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { MailService } from '../mail/mail.service'; 
import { CreateStudentDto } from './dto/create-student.dto';
import { 
  ContractGeneratedResponseDto, 
  ContractPreviewResponseDto,
  ErrorResponseDto 
} from './dto/contract-response.dto';

@ApiTags('Contracts')
@Controller('contracts')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly mailService: MailService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generează și trimite contracte de înscriere',
    description: 'Generează cererea de înscriere și contractul de prestări servicii pentru un student nou, apoi le trimite pe email cu atașamente PDF.'
  })
  @ApiBody({ 
    type: CreateStudentDto,
    description: 'Datele studentului pentru generarea contractelor',
    examples: {
      example1: {
        summary: 'Exemplu student masculin cu cutie mecanică',
        value: {
          nume: 'Popescu',
          prenume: 'Ion',
          cetatenia: 'Republica Moldova',
          email: 'ion.popescu@example.com',
          raion: 'Chișinău',
          localitate: 'Chișinău',
          strada: 'Ștefan cel Mare',
          numar: '123',
          apartament: '45',
          serieActIdentitate: 'A',
          numarActIdentitate: '1234567',
          eliberatDe: 'DSP Chișinău',
          dataEliberare: '15.01.2020',
          dataNasterii: '10.05.1995',
          sex: 'M',
          idnp: '1234567890123',
          telefon: '069123456',
          telefonContact: '069654321',
          cutie: 'MECANICĂ',
          deUndeAflat: 'recomandare'
        }
      },
      example2: {
        summary: 'Exemplu student feminin cu cutie automată',
        value: {
          nume: 'Ionescu',
          prenume: 'Maria',
          cetatenia: 'Republica Moldova',
          email: 'maria.ionescu@example.com',
          raion: 'Botanica',
          localitate: 'Chișinău',
          strada: 'Dacia',
          numar: '50',
          apartament: '12',
          serieActIdentitate: 'B',
          numarActIdentitate: '9876543',
          eliberatDe: 'DSP Botanica',
          dataEliberare: '20.03.2021',
          dataNasterii: '15.08.1998',
          sex: 'F',
          idnp: '9876543210987',
          telefon: '068987654',
          telefonContact: '068123456',
          cutie: 'AUTOMATĂ',
          deUndeAflat: 'rețele socializare'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200,
    description: 'Contractele au fost generate și trimise cu succes pe email',
    type: ContractGeneratedResponseDto,
    example: {
      success: true,
      message: 'Documentele au fost generate și trimise cu succes',
      data: {
        contractNumber: '20251103-456',
        email: 'ion.popescu@example.com',
        studentName: 'Ion Popescu',
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Date de intrare invalide (validare eșuată)',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: [
        'IDNP trebuie să conțină exact 13 cifre',
        'email must be an email',
        'sex must be one of the following values: M, F'
      ],
      error: 'Bad Request'
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Eroare internă la generarea sau trimiterea documentelor',
    type: ErrorResponseDto,
    example: {
      success: false,
      message: 'A apărut o eroare la generarea sau trimiterea documentelor',
      error: 'Failed to generate PDF'
    }
  })
  async generateContracts(@Body() studentDto: CreateStudentDto) {
    try {
      // const contractNumber = this.generateContractNumber();

      const studentData = {
        ...studentDto,
        // contractNumber,
      };

      const { applicationPDF, contractPDF } = 
        await this.contractService.generateContractDocuments(studentData);

      await this.mailService.sendEnrollmentContracts(
        studentDto.email,
        ["instruire.auto.botanica@gmail.com"],
        {
          firstName: studentDto.prenume,
          lastName: studentDto.nume,
          // contractNumber,
          cutie: studentDto.cutie,
          telefon: studentDto.telefon,
        },
        {
          applicationPDF,
          contractPDF,
        }
      );

      return {
        success: true,
        message: 'Documentele au fost generate și trimise cu succes',
        data: {
          // contractNumber,
          email: studentDto.email,
          studentName: `${studentDto.prenume} ${studentDto.nume}`,
        },
      };
    } catch (error) {
      console.error('Eroare la generarea contractelor:', error);
      throw new HttpException(
        {
          success: false,
          message: 'A apărut o eroare la generarea sau trimiterea documentelor',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generează preview pentru contracte (fără trimitere email)',
    description: 'Generează cererea de înscriere și contractul în format PDF și le returnează ca Base64 pentru preview sau download. Email-ul NU este trimis.'
  })
  @ApiBody({ 
    type: CreateStudentDto,
    description: 'Datele studentului pentru generarea contractelor'
  })
  @ApiResponse({ 
    status: 200,
    description: 'Contractele au fost generate cu succes (Base64)',
    type: ContractPreviewResponseDto,
    example: {
      success: true,
      message: 'Documentele au fost generate cu succes',
      data: {
        contractNumber: '20251103-789',
        applicationPDF: 'JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZS...',
        contractPDF: 'JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZS...'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Date de intrare invalide',
    type: ErrorResponseDto
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Eroare internă la generarea documentelor',
    type: ErrorResponseDto,
    example: {
      success: false,
      message: 'A apărut o eroare la generarea documentelor',
      error: 'PDF generation failed'
    }
  })
  async previewContracts(@Body() studentDto: CreateStudentDto) {
    try {
      // const contractNumber = this.generateContractNumber();
      const contractDate = this.getCurrentDate();

      const studentData = {
        ...studentDto,
        // contractNumber,
        contractDate,
      };

      const { applicationPDF, contractPDF } = 
        await this.contractService.generateContractDocuments(studentData);

      return {
        success: true,
        message: 'Documentele au fost generate cu succes',
        data: {
          // contractNumber,
          applicationPDF: applicationPDF.toString('base64'),
          contractPDF: contractPDF.toString('base64'),
        },
      };
    } catch (error) {
      console.error('Eroare la generarea preview-ului:', error);
      throw new HttpException(
        {
          success: false,
          message: 'A apărut o eroare la generarea documentelor',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generează număr de contract unic
   */
  // private generateContractNumber(): string {
  //   const date = new Date();
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const day = String(date.getDate()).padStart(2, '0');
  //   const random = Math.floor(Math.random() * 1000)
  //     .toString()
  //     .padStart(3, '0');
    
  //   return `${year}${month}${day}-${random}`;
  // }

  /**
   * Obține data curentă în format DD.MM.YYYY
   */
  private getCurrentDate(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  }
}
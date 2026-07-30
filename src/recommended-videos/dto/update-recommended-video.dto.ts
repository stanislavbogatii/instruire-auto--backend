import { PartialType } from '@nestjs/mapped-types';
import { CreateRecommendedVideoDto } from './create-recommended-video.dto';

export class UpdateRecommendedVideoDto extends PartialType(CreateRecommendedVideoDto) {}

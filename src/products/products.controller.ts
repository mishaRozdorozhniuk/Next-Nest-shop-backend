import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductRequest } from './dto/create-product.request';
import { CurrentUser } from '../auth/current-user.decorator';
import { TokenPayload } from '../auth/token.payload.interface';
import { ProductsService } from './products.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PRODUCT_IMAGES } from './product-images';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProduct(
    @Body() body: CreateProductRequest,
    @CurrentUser() user: TokenPayload,
  ) {
    return await this.productService.createProduct(body, user.userId);
  }

  @Post(':productId/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: PRODUCT_IMAGES,
        filename: (req, file, callback) => {
          callback(
            null,
            `${req.params.productId}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  uploadProductImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500000 }),
          new FileTypeValidator({ fileType: 'image/jpeg' }),
        ],
      }),
    )
    _file: Express.Multer.File,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProducts(@Query('status') status: string) {
    return await this.productService.getProducts(status);
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  async deleteProduct(
    @CurrentUser() user: TokenPayload,
    @Param('productId') productId: string,
  ) {
    const parsedProductId = parseInt(productId, 10);
    if (isNaN(parsedProductId)) {
      throw new BadRequestException('Invalid productId, it must be a number');
    }
    return await this.productService.deleteProduct(
      user.userId,
      parsedProductId,
    );
  }

  @Get(':productId')
  @UseGuards(JwtAuthGuard)
  async getProduct(@Param('productId') productId: string) {
    const parsedProductId = parseInt(productId, 10);
    console.log('Product ID: Controller', productId);

    if (isNaN(parsedProductId)) {
      throw new BadRequestException('Invalid productId, it must be a number');
    }
    return await this.productService.getProduct(parsedProductId);
  }
}

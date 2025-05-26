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
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    public_id: (req, file) => `product-${req.params.productId}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

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
  @UseInterceptors(FileInterceptor('image', { storage }))
  async uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500000 }),
          new FileTypeValidator({ fileType: /^image\/.*/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const parsedProductId = parseInt(productId, 10);

    await this.productService.updateProductImage(parsedProductId, file.path);

    return {
      imageUrl: file.path,
    };
  }

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

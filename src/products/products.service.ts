import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductRequest } from './dto/create-product.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PRODUCT_IMAGES } from './product-images';
import { Prisma } from '@prisma/client';
import { ProductsGateway } from './products.gateway';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly productsGateway: ProductsGateway,
  ) {}

  async createProduct(data: CreateProductRequest, userId: number) {
    const product = await this.prismaService.product.create({
      data: {
        ...data,
        userId,
      },
    });

    this.productsGateway.handleProductUpdated();

    return product;
  }

  async getProducts(status?: string) {
    const args: Prisma.ProductFindManyArgs = {};

    if (status === 'available') {
      args.where = { sold: false };
    }

    const products = await this.prismaService.product.findMany(args);

    return Promise.all(
      products.map(async (product) => ({
        ...product,
        imageExists: await this.imageExists(product.id),
      })),
    );
  }

  async update(productId: number, data: Prisma.ProductUpdateInput) {
    await this.prismaService.product.update({
      where: {
        id: productId,
      },
      data,
    });
    this.productsGateway.handleProductUpdated();
  }

  async deleteProduct(userId: number, productId: number) {
    const product = await this.prismaService.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or you do not have permission to delete it.',
      );
    }

    const imageExists = await this.imageExists(productId);
    if (imageExists) {
      await this.deleteProductImage(productId);
    }

    return await this.prismaService.product.delete({
      where: {
        id: productId,
      },
    });
  }

  async deleteProductImage(productId: number) {
    const imagePath = join(
      __dirname,
      '../../',
      `public/products/${productId}.jpg`,
    );

    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.error('Error deleting product image:', error);
    }
  }

  private async imageExists(productId: number) {
    try {
      await fs.access(
        join(`${PRODUCT_IMAGES}/${productId}.jpg`),
        fs.constants.F_OK,
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  async getProduct(productId: number) {
    try {
      return {
        ...(await this.prismaService.product.findUniqueOrThrow({
          where: {
            id: productId,
          },
        })),
        imageExists: await this.imageExists(productId),
      };
    } catch (error) {
      throw new NotFoundException('Product not found');
    }
  }
}

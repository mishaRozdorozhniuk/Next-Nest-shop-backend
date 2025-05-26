import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductRequest } from './dto/create-product.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { PRODUCT_IMAGES } from './product-images';
import { Prisma } from '@prisma/client';
import { ProductsGateway } from './products.gateway';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

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

  async updateProductImage(productId: number, imageUrl: string) {
    try {
      return await this.prismaService.product.update({
        where: { id: productId },
        data: { imageUrl },
      });
    } catch (error) {
      throw new NotFoundException('Product not found');
    }
  }

  async getProducts(status?: string) {
    const args: Prisma.ProductFindManyArgs = {};

    if (status === 'available') {
      args.where = { sold: false };
    }

    const products = await this.prismaService.product.findMany(args);

    return Promise.all(
      products.map(async (product) => {
        const imageInfo = await this.imageExists(product.id);

        return {
          ...product,
          imageExists: imageInfo.exists,
          imageExtension: imageInfo.extension,
        };
      }),
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
    try {
      const files = await readdir(PRODUCT_IMAGES);
      const matchingFile = files.find((file) =>
        file.startsWith(`${productId}.`),
      );

      if (matchingFile) {
        const imagePath = join(PRODUCT_IMAGES, matchingFile);
        await unlink(imagePath);
        console.log(`Deleted image: ${imagePath}`);
      } else {
        console.warn(`No image found for product ${productId}`);
      }
    } catch (error) {
      console.error('Error deleting product image:', error);
    }
  }
  private async imageExists(
    productId: number,
  ): Promise<{ exists: boolean; extension?: string }> {
    try {
      const files = await readdir(PRODUCT_IMAGES);
      const match = files.find((file) => file.startsWith(`${productId}.`));

      if (match) {
        const ext = match.substring(match.lastIndexOf('.'));
        return { exists: true, extension: ext };
      }

      return { exists: false };
    } catch {
      return { exists: false };
    }
  }

  async getProduct(productId: number) {
    try {
      const product = await this.prismaService.product.findUniqueOrThrow({
        where: { id: productId },
      });

      const image = await this.imageExists(productId);

      return {
        ...product,
        imageExists: image.exists,
        imageExtension: image.extension,
      };
    } catch (error) {
      throw new NotFoundException('Product not found');
    }
  }
}

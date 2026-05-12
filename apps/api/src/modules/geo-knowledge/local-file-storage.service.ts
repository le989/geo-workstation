import { mkdir, writeFile } from "node:fs/promises";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  buildKnowledgeBaseUploadDirectory,
  buildStoredKnowledgeFilePath
} from "./utils/storage-path.util";

export type UploadedKnowledgeFile = {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer?: Buffer;
};

@Injectable()
export class LocalFileStorageService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async saveKnowledgeFile(knowledgeBaseId: string, file: UploadedKnowledgeFile): Promise<string> {
    const storageRoot = this.configService.get<string>("LOCAL_STORAGE_ROOT") ?? "./storage";
    const directory = buildKnowledgeBaseUploadDirectory(storageRoot, knowledgeBaseId);
    const storagePath = buildStoredKnowledgeFilePath(
      storageRoot,
      knowledgeBaseId,
      file.originalname
    );

    await mkdir(directory, {
      recursive: true
    });
    await writeFile(storagePath, file.buffer ?? Buffer.alloc(0));

    return storagePath;
  }
}

import { Storage, UploadOptions } from "@google-cloud/storage";
import { exec } from "child_process";
import { unlink } from "fs";

import { env } from "./env";

const uploadToGCS = async ({ name, path }: { name: string; path: string }) => {
  console.log("Uploading backup to GCS...");

  const bucketName = env.GCS_BUCKET;

  const uploadOptions: UploadOptions = {
    destination: name,
  };

  const storage = new Storage({
    projectId: env.GOOGLE_PROJECT_ID,
    credentials: JSON.parse(env.SERVICE_ACCOUNT_JSON),
  });

  await storage.bucket(bucketName).upload(path, uploadOptions);

  console.log("Backup uploaded to GCS...");
};

const backupPgData = async (path: string) => {
  console.log("Backing up PostgreSQL data directory...");

  await new Promise((resolve, reject) => {
    exec(`tar -czf ${path} -C /var/lib/postgresql data`, (error, _, stderr) => {
      if (error) {
        reject({ error: JSON.stringify(error), stderr });
        return;
      }

      resolve(undefined);
    });
  });

  console.log("PostgreSQL data directory backed up...");
};

export const backup = async () => {
  console.log("Initiating PostgreSQL data backup...");

  let date = new Date().toISOString();
  const timestamp = date.replace(/[:.]+/g, "-");
  const filename = `${env.BACKUP_PREFIX}pgdata-backup-${timestamp}.tar.gz`;
  const filepath = `/tmp/${filename}`;

  await backupPgData(filepath);
  await uploadToGCS({ name: filename, path: filepath });
  //await deleteFile(filepath);

  console.log("PostgreSQL data backup complete...");
};

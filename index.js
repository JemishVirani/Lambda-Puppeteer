import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// import { MongoClient } from "mongodb";
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
	accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
	Bucket: process.env.AWS_S3_BUCKET_NAME,
});
// const client = new MongoClient(process.env.MONGODB_URI);

export const handler = async (event) => {
	//const response = await generatePdf();
	//return response;

	try {
		const { htmlData, fileName, s3BucketKey = 'giftcards' } = event;
		if (!htmlData || !fileName || !s3BucketKey)
			throw new Error(
				'All fields are required. [htmlData, fileName, s3BucketKey]'
			);

		const buffer = await generatePdf(htmlData);
		console.time();
		const s3Data = await uploadPdfToS3(buffer, fileName, s3BucketKey);
		console.timeEnd();
		console.log(s3Data);
		return {
			url: s3Data.Location,
		};
	} catch (error) {
		throw error;
	}
};

const uploadPdfToS3 = async (pdfBuffer, pdfName, s3BucketKey) => {
	return new Promise((resolve, reject) => {
		// Define parameters for the S3 upload
		const params = {
			Bucket: process.env.AWS_S3_BUCKET_NAME,
			Key: `${s3BucketKey}/${pdfName}.pdf`,
			Body: pdfBuffer,
			ContentType: 'application/pdf',
		};

		// Upload the PDF to S3
		s3.upload(params, (error, data) => {
			if (error) reject(error);
			resolve(data);
		});
	});
};

const generatePdf = async (htmlData) => {
	try {
		console.time();
		const browser = await puppeteer.launch({
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			executablePath: await chromium.executablePath(),
			headless: chromium.headless,
			ignoreHTTPSErrors: true,
		});
		console.timeEnd();

		console.time();
		const page = await browser.newPage();
		const renderedHtml = htmlData;
		await page.setContent(renderedHtml);
		const buffer = await page.pdf({
			format: 'A4', // Paper format
		});
		console.log('PDF generated successfully!');
		await browser.close();
		console.timeEnd();

		return buffer;
	} catch (error) {
		throw error;
	}
};

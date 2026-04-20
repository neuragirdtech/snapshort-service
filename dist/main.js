"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.use((0, express_1.json)({ limit: '100mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '100mb' }));
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`SnapCut Service is running on : ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
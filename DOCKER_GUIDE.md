# Hướng dẫn Docker cho dự án CreaTShop

Tài liệu này giải thích Docker theo cách dễ hiểu và hướng dẫn áp dụng Docker vào dự án CreaTShop.

## 1. Docker có chạy được trong project này không?

Có. Project hiện đã có sẵn file Docker cho cả backend và frontend:

| Phần | File Docker | Vai trò |
|:--|:--|:--|
| Backend Spring Boot | `CreaTShop-server/creatshop/Dockerfile` | Build file `.jar` bằng Maven rồi chạy app Java |
| Backend + MySQL | `CreaTShop-server/creatshop/docker-compose.yml` | Chạy MySQL 8 và Spring Boot API cùng lúc |
| Frontend React/Vite | `CreaTShop-Client/Dockerfile` | Build React app rồi serve bằng Nginx |
| Frontend container | `CreaTShop-Client/docker-compose.yml` | Chạy frontend tại port `5173` |

Tuy nhiên, khi kiểm tra trong terminal hiện tại, lệnh `docker` chưa tồn tại:

```text
docker : The term 'docker' is not recognized
```

Điều này nghĩa là máy hoặc terminal hiện tại chưa cài Docker, Docker Desktop chưa chạy, hoặc Docker chưa được thêm vào `PATH`. Muốn chạy project bằng Docker, cần cài Docker Desktop trước.

## 2. Docker là gì?

Docker là công cụ đóng gói ứng dụng và môi trường chạy của nó vào một "container".

Nếu chạy bình thường, bạn phải tự cài:

- JDK
- Maven
- MySQL
- Node.js
- Nginx
- Cấu hình database
- Cấu hình port

Khi dùng Docker, các phần đó được mô tả bằng file:

- `Dockerfile`: chỉ dẫn cách build một image.
- `docker-compose.yml`: chỉ dẫn cách chạy nhiều container cùng nhau.

Nói ngắn gọn:

```text
Dockerfile        -> Công thức tạo image
Image             -> Bản đóng gói app
Container         -> App đang chạy từ image
docker-compose.yml -> File chạy nhiều container cùng lúc
```

Trong project này, Docker giúp bạn chạy:

```text
MySQL container + Spring Boot container + React/Nginx container
```

## 3. Cài Docker Desktop trên Windows

1. Tải Docker Desktop tại:

```text
https://www.docker.com/products/docker-desktop/
```

2. Cài đặt Docker Desktop.

3. Mở Docker Desktop.

4. Đợi góc dưới hoặc dashboard báo Docker đang chạy.

5. Mở PowerShell mới và kiểm tra:

```powershell
docker --version
docker compose version
```

Nếu thành công, bạn sẽ thấy kết quả tương tự:

```text
Docker version 26.x.x
Docker Compose version v2.x.x
```

Nếu vẫn báo `docker is not recognized`, hãy thử:

- Tắt PowerShell rồi mở lại.
- Khởi động lại máy.
- Mở Docker Desktop trước khi chạy lệnh.
- Kiểm tra Docker Desktop đã bật WSL 2 backend.

## 4. Docker đang được dùng như thế nào trong backend?

Backend nằm tại:

```text
CreaTShop-server/creatshop
```

### 4.1. Backend Dockerfile

File:

```text
CreaTShop-server/creatshop/Dockerfile
```

Dockerfile này có 2 stage:

| Stage | Image | Việc làm |
|:--|:--|:--|
| Build | `maven:3.8.4-openjdk-17` | Copy source code và chạy `mvn clean install` |
| Runtime | `openjdk:17-jdk-slim` | Copy file `.jar` đã build và chạy bằng `java -jar app.jar` |

Luồng hoạt động:

```text
Source code Spring Boot
        |
        v
Maven build trong Docker
        |
        v
target/*.jar
        |
        v
OpenJDK container chạy app.jar
```

### 4.2. Backend docker-compose.yml

File:

```text
CreaTShop-server/creatshop/docker-compose.yml
```

File này chạy 2 service:

| Service | Container | Port | Vai trò |
|:--|:--|:--|:--|
| `mysql` | `mysql-contai` | `3306:3306` | Database MySQL 8 |
| `springboot` | `springboot-container` | `8080:8080` | Backend Spring Boot API |

Backend trong Docker kết nối tới MySQL bằng URL:

```text
jdbc:mysql://mysql:3306/creatshopdb?createDatabaseIfNotExist=true
```

Ở đây `mysql` không phải là `localhost`. Đó là tên service trong Docker Compose. Các container trong cùng một compose network có thể gọi nhau bằng tên service.

## 5. Chạy backend và MySQL bằng Docker

Mở PowerShell tại thư mục gốc project:

```powershell
cd D:\TTCSN-2025
```

Đi vào backend:

```powershell
cd CreaTShop-server\creatshop
```

Chạy Docker Compose:

```powershell
docker compose up -d --build
```

Ý nghĩa:

| Phần lệnh | Ý nghĩa |
|:--|:--|
| `docker compose` | Dùng Docker Compose |
| `up` | Khởi động các service trong `docker-compose.yml` |
| `-d` | Chạy nền, không chiếm terminal |
| `--build` | Build lại image trước khi chạy |

Sau khi chạy xong:

```text
Backend API : http://localhost:8080/api/v1
Swagger UI  : http://localhost:8080/swagger-ui/index.html
MySQL       : localhost:3306
```

Kiểm tra container:

```powershell
docker compose ps
```

Xem log backend:

```powershell
docker compose logs -f springboot
```

Xem log MySQL:

```powershell
docker compose logs -f mysql
```

Dừng backend và MySQL:

```powershell
docker compose down
```

## 6. Chạy frontend bằng Docker

Frontend nằm tại:

```text
CreaTShop-Client
```

File frontend Docker Compose đọc biến môi trường `VITE_API_URL` từ `.env`.

Nên sửa file:

```text
CreaTShop-Client/.env
```

Nội dung nên là:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Không nên để khoảng trắng quanh dấu `=`. Ví dụ này không khuyến nghị:

```env
VITE_API_URL = http://localhost:8080/api/v1
```

Chạy frontend:

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
docker compose up -d --build
```

Sau khi chạy xong:

```text
Frontend: http://localhost:5173
Backend : http://localhost:8080/api/v1
```

Dừng frontend:

```powershell
docker compose down
```

## 7. Thứ tự chạy khuyến nghị

Nên chạy backend trước, vì frontend cần gọi API backend.

### Bước 1: chạy backend + MySQL

```powershell
cd D:\TTCSN-2025\CreaTShop-server\creatshop
docker compose up -d --build
```

Đợi backend chạy xong, mở thử:

```text
http://localhost:8080/swagger-ui/index.html
```

### Bước 2: chạy frontend

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
docker compose up -d --build
```

Mở frontend:

```text
http://localhost:5173
```

## 8. Các lệnh Docker thường dùng

### Xem container đang chạy

```powershell
docker ps
```

### Xem tất cả container, kể cả container đã dừng

```powershell
docker ps -a
```

### Xem image đã build/tải về

```powershell
docker images
```

### Xem log service trong Docker Compose

```powershell
docker compose logs -f
```

Hoặc xem riêng từng service:

```powershell
docker compose logs -f springboot
docker compose logs -f mysql
```

### Dừng container trong compose hiện tại

```powershell
docker compose down
```

### Build lại từ đầu

```powershell
docker compose up -d --build
```

### Xóa container/image không dùng

```powershell
docker system prune
```

Lệnh này sẽ hỏi xác nhận trước khi xóa dữ liệu không dùng. Không nên dùng nếu bạn chưa chắc mình muốn dọn Docker.

## 9. Database MySQL trong Docker

Backend compose dùng MySQL 8:

```yaml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: 123
    MYSQL_DATABASE: creatshopdb
  ports:
    - "3306:3306"
  volumes:
    - ./db/init:/docker-entrypoint-initdb.d
```

Ý nghĩa:

| Cấu hình | Ý nghĩa |
|:--|:--|
| `MYSQL_ROOT_PASSWORD=123` | Mật khẩu user `root` trong container |
| `MYSQL_DATABASE=creatshopdb` | Tạo database mặc định |
| `3306:3306` | Máy thật truy cập MySQL qua `localhost:3306` |
| `./db/init:/docker-entrypoint-initdb.d` | Chạy file SQL khởi tạo khi MySQL container được tạo lần đầu |

File seed database:

```text
CreaTShop-server/creatshop/db/init/init.sql
```

File này tạo database, bảng, role, user mẫu, category, product và variant mẫu.

## 10. Những lỗi dễ gặp

### 10.1. `docker is not recognized`

Nguyên nhân:

- Chưa cài Docker Desktop.
- Docker Desktop chưa chạy.
- Terminal mở trước khi cài Docker.
- Docker chưa nằm trong `PATH`.

Cách xử lý:

```powershell
docker --version
docker compose version
```

Nếu vẫn lỗi, hãy mở Docker Desktop, khởi động lại PowerShell hoặc restart máy.

### 10.2. Port `3306` đã được dùng

Nếu máy đã cài MySQL local, port `3306` có thể bị chiếm.

Cách xử lý nhanh:

- Tắt MySQL local.
- Hoặc đổi port trong `CreaTShop-server/creatshop/docker-compose.yml`.

Ví dụ đổi:

```yaml
ports:
  - "3307:3306"
```

Khi đó MySQL trong Docker sẽ được truy cập từ máy thật qua `localhost:3307`. Backend container vẫn dùng `mysql:3306`, không cần đổi.

### 10.3. Port `8080` đã được dùng

Nếu có app khác đang chạy port `8080`, backend container sẽ không start được.

Cách xử lý:

```yaml
ports:
  - "8081:8080"
```

Sau đó API trên máy thật là:

```text
http://localhost:8081/api/v1
```

Nếu đổi port backend, frontend `.env` cũng phải đổi theo:

```env
VITE_API_URL=http://localhost:8081/api/v1
```

### 10.4. Build backend lâu hoặc lỗi tải dependency

Lần đầu build backend, Docker phải tải:

- Maven image
- OpenJDK image
- Maven dependencies trong `pom.xml`

Vì vậy lần đầu có thể lâu. Nếu mạng yếu hoặc không có internet, build có thể fail.

Chạy lại:

```powershell
docker compose up -d --build
```

### 10.5. Frontend gọi API bị lỗi

Kiểm tra:

1. Backend có chạy chưa?

```text
http://localhost:8080/swagger-ui/index.html
```

2. File `CreaTShop-Client/.env` có đúng không?

```env
VITE_API_URL=http://localhost:8080/api/v1
```

3. Sau khi sửa `.env`, phải build lại frontend:

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
docker compose up -d --build
```

Với Vite, biến `VITE_API_URL` được nhúng khi build, không phải lúc container đang chạy.

## 11. Có nên chạy toàn bộ bằng Docker không?

Với project này, có 2 cách hợp lý.

### Cách 1: Dễ nhất cho người mới

Chạy backend + MySQL bằng Docker, chạy frontend bằng npm:

```powershell
cd D:\TTCSN-2025\CreaTShop-server\creatshop
docker compose up -d --build
```

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
npm install
npm run dev
```

Cách này dễ debug frontend hơn.

### Cách 2: Chạy cả backend, database và frontend bằng Docker

Terminal 1:

```powershell
cd D:\TTCSN-2025\CreaTShop-server\creatshop
docker compose up -d --build
```

Terminal 2:

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
docker compose up -d --build
```

Sau đó mở:

```text
Frontend  : http://localhost:5173
Swagger UI: http://localhost:8080/swagger-ui/index.html
```

## 12. Tóm tắt nhanh

Nếu Docker đã cài xong, chạy backend:

```powershell
cd D:\TTCSN-2025\CreaTShop-server\creatshop
docker compose up -d --build
```

Chạy frontend:

```powershell
cd D:\TTCSN-2025\CreaTShop-Client
docker compose up -d --build
```

Mở trình duyệt:

```text
http://localhost:5173
```

Kiểm tra API:

```text
http://localhost:8080/swagger-ui/index.html
```

Trong terminal hiện tại, Docker chưa sẵn sàng vì lệnh `docker` chưa được nhận diện. Sau khi cài Docker Desktop và mở lại terminal, hãy chạy lại:

```powershell
docker --version
docker compose version
```

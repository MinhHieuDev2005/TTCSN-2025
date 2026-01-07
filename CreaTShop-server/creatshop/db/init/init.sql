CREATE DATABASE IF NOT EXISTS creatshopdb
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE creatshopdb;

SET character_set_client = 'utf8mb4';

create table carts
(
    id         int auto_increment
        primary key,
    created_at datetime(6) null,
    updated_at datetime(6) null
);

create table categories
(
    id            int auto_increment
        primary key,
    created_at    datetime(6)                          null,
    updated_at    datetime(6)                          null,
    description   varchar(255)                         null,
    name          varchar(255)                         null,
    category_type enum ('BOY', 'GIRL', 'MEN', 'WOMEN') not null
);

create table products
(
    category_id       int          null,
    id                int auto_increment
        primary key,
    price             double       not null,
    created_at        datetime(6)  null,
    updated_at        datetime(6)  null,
    image_dynamic_url varchar(255) not null,
    image_static_url  varchar(255) not null,
    name              varchar(255) not null,
    constraint FKog2rp4qthbtt2lfyhfo32lsw9
        foreign key (category_id) references categories (id)
);

create table product_info
(
    id         int auto_increment
        primary key,
    product_id int          null,
    quantity   int          null,
    created_at datetime(6)  null,
    updated_at datetime(6)  null,
    color      varchar(255) not null,
    image_url  varchar(255) null,
    name       varchar(255) null,
    size       varchar(255) null,
    constraint FKiutxcf5w2rn7x1wqxkdcw5crs
        foreign key (product_id) references products (id)
);

create table cart_items
(
    cart_id            int null,
    id                 int auto_increment
        primary key,
    product_id         int not null,
    product_variant_id int not null,
    quantity           int not null,
    constraint FK1re40cjegsfvw58xrkdp6bac6
        foreign key (product_id) references products (id),
    constraint FK48fve28brcorxjxidblgjyuno
        foreign key (product_variant_id) references product_info (id),
    constraint FKpcttvuq4mxppo8sxggjtn5i2c
        foreign key (cart_id) references carts (id)
);

create table roles
(
    id          int auto_increment
        primary key,
    created_at  datetime(6)  null,
    updated_at  datetime(6)  null,
    description varchar(255) null,
    role_type   char(36)     null,
    constraint UK6kpjgt1lwdofsckw70uo9eo0
        unique (role_type)
);

create table users
(
    cart_id       int                       null,
    role_id       int                       null,
    created_at    datetime(6)               null,
    date_of_birth datetime(6)               null,
    updated_at    datetime(6)               null,
    email         varchar(255)              not null,
    first_name    varchar(255)              not null,
    id            char(36)                  not null
        primary key,
    last_name     varchar(255)              not null,
    password      varchar(255)              not null,
    phone_number  varchar(255)              not null,
    username      varchar(255)              not null,
    status        enum ('ACTIVE', 'BANNED') not null,
    constraint UK6dotkott2kjsp8vw4d0m25fb7
        unique (email),
    constraint UKpnp1baae4enifkkuq2cd01r9l
        unique (cart_id),
    constraint UKr43af9ap4edm43mmtq01oddj6
        unique (username),
    constraint FKdv26y3bb4vdmsr89c9ppnx85w
        foreign key (cart_id) references carts (id),
    constraint FKp56c1712k691lhsyewcssf40f
        foreign key (role_id) references roles (id)
);

create table addresses
(
    id             int auto_increment
        primary key,
    address_detail varchar(255) not null,
    city           varchar(255) not null,
    commune        varchar(255) not null,
    country        varchar(255) not null,
    description    varchar(255) null,
    district       varchar(255) not null,
    first_name     varchar(255) not null,
    last_name      varchar(255) not null,
    phone_number   varchar(255) not null,
    user_id        char(36)     null,
    constraint FK1fa36y2oqhao3wgg2rw1pi459
        foreign key (user_id) references users (id)
);

create table order_details
(
    id         int auto_increment
        primary key,
    total      double                                      null,
    created_at datetime(6)                                 null,
    updated_at datetime(6)                                 null,
    user_id    char(36)                                    null,
    status     enum ('Delivered', 'Processing', 'Shipped') null,
    constraint FKk2w14ysy80rutm079xu6d4ygm
        foreign key (user_id) references users (id)
);

create table order_item
(
    id              int auto_increment
        primary key,
    order_id        int         null,
    product_id      int         null,
    product_variant int         null,
    quantity        int         null,
    created_at      datetime(6) null,
    updated_at      datetime(6) null,
    constraint FK8jtk8dq0y0v8ajm7lcvwy66un
        foreign key (order_id) references order_details (id),
    constraint FKbv6tkvl0kvnmox333je9hnort
        foreign key (product_variant) references product_info (id),
    constraint FKc5uhmwioq5kscilyuchp4w49o
        foreign key (product_id) references products (id)
);

create table payment_details
(
    amount     double                                              null,
    id         int auto_increment
        primary key,
    order_id   int                                                 null,
    created_at datetime(6)                                         null,
    updated_at datetime(6)                                         null,
    provider   varchar(255)                                        null,
    status     enum ('CANCELED', 'COMPLETED', 'FAILED', 'PENDING') null,
    constraint UKof2hvjrt3h42uja5aibie81tp
        unique (order_id),
    constraint FKqnay946png0id4ie8oxe6ec65
        foreign key (order_id) references order_details (id)
);

INSERT INTO roles (role_type, description, created_at, updated_at)
VALUES 
    ('ROLE_ADMIN', 'This role for admin', NOW(), NOW()),
    ('ROLE_USER', 'This role for user', NOW(), NOW());
    
-- Tạo dữ liệu cho bảng carts
INSERT INTO carts (id, created_at, updated_at)
VALUES
    (1, NOW(), NOW()),
    (2, NOW(), NOW()),
    (3, NOW(), NOW()),
    (4, NOW(), NOW()),
    (5, NOW(), NOW()),
    (6, NOW(), NOW()),
    (7, NOW(), NOW()),
    (8, NOW(), NOW()),
    (9, NOW(), NOW()),
    (10, NOW(), NOW()),
    (11, NOW(), NOW()),
    (12, NOW(), NOW()),
    (13, NOW(), NOW()),
    (14, NOW(), NOW()),
    (15, NOW(), NOW()),
    (16, NOW(), NOW()),
    (17, NOW(), NOW()),
    (18, NOW(), NOW()),
    (19, NOW(), NOW()),
    (20, NOW(), NOW()),
    (21, NOW(), NOW()),
    (22, NOW(), NOW()),
    (23, NOW(), NOW()),
    (24, NOW(), NOW()),
    (25, NOW(), NOW());

-- Thêm 20 user với thông tin cụ thể
INSERT INTO users (
    cart_id,
    role_id,
    created_at,
    date_of_birth,
    updated_at,
    email,
    first_name,
    id,
    last_name,
    password,
    phone_number,
    username,
    status
)
VALUES
    (1, 1, NOW(), '1990-01-15', NOW(), 'le292620@gmail.com', 'Lê', UUID(), 'Hồng Anh', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '039125678', 'lehonganh','ACTIVE'),
    (2, 1, NOW(), '1990-01-15', NOW(), 'lephuonganhktpm1k17@gmail.com', 'Lê', UUID(), 'Phương Anh', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0901234567', 'lephuonganh','ACTIVE'),
    (3, 1, NOW(), '1990-01-15', NOW(), 'vthn3003@gmail.com', 'Vu Thi', UUID(), 'Hong Nhung', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0901234567', 'vuthihongnhung','ACTIVE'),
    (4, 1, NOW(), '1990-01-15', NOW(), 'nguyenthianhphuong2000tp@gmail.com', 'Nguyen Thi', UUID(), 'Anh Phuong', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0901234567', 'nguyenthianhphuong','ACTIVE'),
    (5, 2, NOW(), '1990-01-15', NOW(), 'nguyen.van.a1@example.com', 'Nguyễn', UUID(), 'Văn A', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0901234567', 'nguyenvana1','ACTIVE'),
    (6, 2, NOW(), '1992-03-05', NOW(), 'tran.thi.b2@example.com', 'Trần', UUID(), 'Thị B', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0902234567', 'tranthib2','ACTIVE'),
    (7, 2, NOW(), '1995-06-18', NOW(), 'le.van.c3@example.com', 'Lê', UUID(), 'Văn C', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0903234567', 'levanc3','ACTIVE'),
    (8, 2, NOW(), '1988-10-10', NOW(), 'pham.thi.d4@example.com', 'Phạm', UUID(), 'Thị D', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0904234567', 'phamthid4','ACTIVE'),
    (9, 2, NOW(), '1993-11-12', NOW(), 'vo.van.e5@example.com', 'Võ', UUID(), 'Văn E', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0905234567', 'vovane5','ACTIVE'),
    (10, 2, NOW(), '1989-02-14', NOW(), 'hoang.thi.f6@example.com', 'Hoàng', UUID(), 'Thị F', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0906234567', 'hoangthif6','ACTIVE'),
    (11, 2, NOW(), '1991-01-23', NOW(), 'dao.van.g7@example.com', 'Đào', UUID(), 'Văn G', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0907234567', 'daovang7','ACTIVE'),
    (12, 2, NOW(), '1994-05-30', NOW(), 'bui.thi.h8@example.com', 'Bùi', UUID(), 'Thị H', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0908234567', 'buithih8','ACTIVE'),
    (13, 2, NOW(), '1987-09-07', NOW(), 'nguyen.van.i9@example.com', 'Nguyễn', UUID(), 'Văn I', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0909234567', 'nguyenvani9','ACTIVE'),
    (14, 2, NOW(), '1990-04-25', NOW(), 'pham.thi.j10@example.com', 'Phạm', UUID(), 'Thị J', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0910234567', 'phamthij10','ACTIVE'),
    (15, 2, NOW(), '1986-12-03', NOW(), 'vo.van.k11@example.com', 'Võ', UUID(), 'Văn K', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0911234567', 'vovank11','ACTIVE'),
    (16, 2, NOW(), '1992-07-19', NOW(), 'le.thi.l12@example.com', 'Lê', UUID(), 'Thị L', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0912234567', 'lethil12','ACTIVE'),
    (17, 2, NOW(), '1985-11-22', NOW(), 'hoang.van.m13@example.com', 'Hoàng', UUID(), 'Văn M', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0913234567', 'hoangvanm13','ACTIVE'),
    (18, 2, NOW(), '1993-01-09', NOW(), 'dao.thi.n14@example.com', 'Đào', UUID(), 'Thị N', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0914234567', 'daothin14','ACTIVE'),
    (19, 2, NOW(), '1987-06-17', NOW(), 'bui.van.o15@example.com', 'Bùi', UUID(), 'Văn O', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0915234567', 'buivano15','ACTIVE'),
    (20, 2, NOW(), '1995-03-20', NOW(), 'nguyen.thi.p16@example.com', 'Nguyễn', UUID(), 'Thị P', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0916234567', 'nguyenthp16','ACTIVE'),
	(21, 2, NOW(), '1990-01-01', NOW(), 'tran.thi.q17@example.com', 'Trần', UUID(), 'Thị Q', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0917234567', 'tranthiq17','ACTIVE'),
    (22, 2, NOW(), '1985-05-10', NOW(), 'le.van.r18@example.com', 'Lê', UUID(), 'Văn R', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0918234567', 'levanr18','ACTIVE'),
    (23, 2, NOW(), '1993-08-08', NOW(), 'vo.thi.s19@example.com', 'Võ', UUID(), 'Thị S', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0919234567', 'vothis19','ACTIVE'),
    (24, 2, NOW(), '1988-12-12', NOW(), 'pham.van.t20@example.com', 'Phạm', UUID(), 'Văn T', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0920234567', 'phamvant20','ACTIVE'),
    (25, 2, NOW(), '1991-03-03', NOW(), 'nguyen.thi.u21@example.com', 'Nguyễn', UUID(), 'Thị U', '$2a$12$O3lo5Yc5k/VAODQLFuGKTuPYYyMS/qqxAlHhVZ6n10x8890qXATzK', '0921234567', 'nguyenthih21','ACTIVE');
    
-- Thêm bản ghi cho các loại categories
INSERT INTO categories (created_at, updated_at, name, category_type)
VALUES
    -- Các loại MEN
    (NOW(), NOW(), 'Hunter', 'MEN'),
    (NOW(), NOW(), 'Sandal', 'MEN'),
    (NOW(), NOW(), 'Giày Thể Thao', 'MEN'),
    (NOW(), NOW(), 'Giày Chạy Bộ & Đi Bộ', 'MEN'),
    (NOW(), NOW(), 'Giày Đá Banh', 'MEN'),
    (NOW(), NOW(), 'Giày Tây', 'MEN'),
    (NOW(), NOW(), 'Dép', 'MEN'),

    -- Các loại WOMEN
    (NOW(), NOW(), 'Hunter', 'WOMEN'),
    (NOW(), NOW(), 'GOSTO', 'WOMEN'),
    (NOW(), NOW(), 'Êmbrace', 'WOMEN'),
    (NOW(), NOW(), 'Women', 'WOMEN'),

    -- Các loại BOY
    (NOW(), NOW(), 'Giày Thể Thao', 'BOY'),
    (NOW(), NOW(), 'Sandal', 'BOY'),
    (NOW(), NOW(), 'Dép', 'BOY'),
    (NOW(), NOW(), 'Giày Tập Đi', 'BOY'),

    -- Các loại GIRL
    (NOW(), NOW(), 'Giày Búp Bê', 'GIRL'),
    (NOW(), NOW(), 'Giày Thể Thao', 'GIRL'),
    (NOW(), NOW(), 'Sandal', 'GIRL'),
    (NOW(), NOW(), 'Dép Bé Gái', 'GIRL'),
    (NOW(), NOW(), 'Giày Tập Đi', 'GIRL');

-- Thêm sản phẩm cho category_id = 1 (Hunter - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (1, 854000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008500xnh__3__582142dee5ec42e6888fb69416ca72c5_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis HSM008500XNH'),
    (1, 854000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008500xam__3__d291a800528e449ab9ff4f6fb8b06edf_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis HSM008500XAM'),
    (1, 854000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008500den__6__e058046969504de684c52d66a28d1f7e_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008500den__8__4a7ff19c085b4bacb78c0670cb357707_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis HSM008500DEN'),
    (1, 742000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm007200kem__6__489a684a7a214be5904e5c29e964a3e0_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm007200kem__8__9ccc737a14514d6f84c89492b2cfc2be_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Jogging HSM007200KEM'),
    (1, 732000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004700trg__5__097267b1488e4cbca2e8ff391dd3836a_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004700trg__6__f55d057a6fb64cc498e04f8ce7fa4b31_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter STREET FESTIVE: FERIA COLLECTION HSM004700TRG'),
    (1, 687000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008600nad__5__d6b17e3349aa4e289ab490126e620aa9_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008600nad__2__aad7460df4a04103b37a4d391caf82be_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Street HSM008600NAD'),
    (1, 687000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008600xld__5__dc142aeae24a442281d0b13f26ce4ff2_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008600xld__2__b333aecee37842eba61cc5cd28060ecf_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Street HSM008600XLD'),
    (1, 687000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm008600den__5__5ea702882f5c4a61aea1456394f4ed8f_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008600den__2__218a086d599b47fcb02baa06cc5dd33b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Street HSM008600DEN'),
    (1, 1050000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm007506dod-1_c7e46195bc244d638f56230d53e1a05e_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm007506dod-7_81f41306f3e74b4c98473ffae30c4077_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter X LiteDash - Original Edition 2K24 HSM007506DOD'),
    (1, 1050000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm007506xdl-1_fd26632ac5e043eea4cd0b070da4a44a_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm007506xdl-7_8f6f15e167f14ab187e81ab1e4f4ef1d_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter X LiteDash - Original Edition 2K24 HSM007506XDL0');

-- Thêm sản phẩm cho category_id = 2 (Sandal - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (2, 457000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/r-americano-demh00400-ner4b-color-den_26848780da6b48318abb61a422435ad8_f8b135c14b0d48449b9a859de169a63b_master.jpg', 'https://product.hstatic.net/1000230642/product/r-americano-demh00400-apw94-color-den_2fd4e0d599ce4e8bb71d45e13af4012b_38e993f49f7a4e25b54c0b5b7a99c2eb_master.jpg', 'Sandal Nam Bitis Hunter Tonic DEMH00400DEN'),
    (2, 457000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/00400cam__2__702532fd22234aecb4c155e8144d76f4_fd40af88554a4b6384a6786f1db258c0_master.jpg', 'https://product.hstatic.net/1000230642/product/00400cam__5__079dfa889a6e4bd49090aa9de80c61b8_d75867ce8a1a4d6e8c62db2167e4b331_master.jpg', 'Sandal Nam Bitis Hunter Tonic DEMH00400CAM'),
    (2, 388000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm002400nau__5__33634851c0db42efaaa90b78d9fc581d_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm002400nau__2__8c6370b4a43740ff891c118e475fa10f_1024x1024.jpg', 'Sandal Nam Bitis BPM002400NAU'),
    (2, 472000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bdm001877den__5__c8172feefd71433fb51c5c9be2be6009_large.jpg', 'https://product.hstatic.net/1000230642/product/bdm001877den__2__2b3b920f70d04cd8bbde867f6c9791fc_1024x1024.jpg', 'Sandal Nam Bitis BDM001877DEN'),
    (2, 500000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bdm001877nad__5__bd4b0954ebc54315b1ea9d59575d490f_large.jpg', 'https://product.hstatic.net/1000230642/product/bdm001877nad__2__7c6cbd8c4a494a56be1fc58bd9efa0f4_1024x1024.jpg', 'Sandal Nam Bitis BDM001877NAD'),
    (2, 520000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hem000800xam__5__038c8db445964cdf8a9249d9e301b360_master.jpg', 'https://product.hstatic.net/1000230642/product/hem000800xam__2__b700b4a63c884440b6cca79933947024_master.jpg', 'Sandal Nam Biti’s Hunter X Dune Coastal Edition HEM000800XAM'),
    (2, 388000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001800nad__6__06b39cad240848e19c0dcc22974abbf7_large.png', 'https://product.hstatic.net/1000230642/product/bpm001800nad__7__28a772d037ed4ece9231daebc9b28ef6_1024x1024.png', 'Sandal Nam Bitis BPM001800NAD'),
    (2, 388000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001800den__5__64b787c393aa4e5c93e3ae11879eb1b6_large.png', 'https://product.hstatic.net/1000230642/product/bpm001800den__7__1bd7e10441224029bca7dac53134b51b_1024x1024.png', 'Sandal Nam Bitis BPM001800DEN'),
    (2, 388000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm002401den__5__065682c6852743f8938420cea13f18e0_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm002401den__2__794d37d46390422aac931feb03af0392_1024x1024.jpg', 'Sandal Nam Bitis BPM002401DEN'),
    (2, 461000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hem000900xnh__3__d141c6b6548a47b4a1326175700eac78_2187e14cf8544d20baa3d8797505ff9f_master.jpg', 'https://product.hstatic.net/1000230642/product/hem000900xnh__2__d8a1f9b0279b4624b581f313b26a99b9_682a7df7a1cc4713a2c6adb2a63b59fe_master.jpg', 'Sandal Nam Bitis Hunter HEM000900XNH');

-- Thêm sản phẩm cho category_id = 3 (Giày Thể Thao - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (3, 359000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm004000xnh__5__93b17d7fc4964d4daef1816502061fc9_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm004000xnh__2__d8690e5d3b064e21b9b922e9aca9a3c9_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM004000XNH'),
    (3, 359000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm004000xam__5__247e2ae7504b4e0d8f8704880be8fd32_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm004000xam__2__3f53bd7b81764f26b3e0027086a2248f_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM004000XAM'),
    (3, 359000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm004000den__5__dc903581759a474fb89db7222591a7ff_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm004000den__2__f1efad88c9bd498aa5044f7198f49d49_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM004000DEN'),
    (3, 369000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/003900trg__6__9863635118384093b19ad4487ea63c9a_large.jpg', 'https://product.hstatic.net/1000230642/product/003900trg__3__a3023245c5d244ff872fd9b3bf501c6e_1024x1024.jpg', 'Giày Thể Thao Thông Dụng Nam Bitis BSM003900'),
    (3, 428000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm000701den__5__70de738e494245e284c7a157207b11ea_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm000701den__2__d91ef94967f54d8a8712f31e3ce5ebe6_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM000701'),
    (3, 236000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm002900kem__4__1a5f464b89c04bbbad3aae77f2727188_9e9efdcfbc7546c6b05f9a8478f375f9_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm002900kem__2__8f8db281406c43d8af550c144b6d132c_5b3901d5ac2b46e08b1c7b65bba0f707_1024x1024.jpg', 'Giày Thông Dụng Eva Phun Nam Bitis E-Flow BSM002900'),
    (3, 555000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm002300xnh10_5c88be8f415f4f7d838889b2aa019e29_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm002300xnh2_34295c4ef2be4b04b0d5263d762b26dc_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM002300'),
    (3, 706000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gsm000200nau10_265e6f8c4b174c6291e5268a973cea59_230a17a58ffe452a9395cbb419455a8d_large.jpg', 'https://product.hstatic.net/1000230642/product/gsm000200nau2_9baeb52ce20f4c0990f2241dcad77f30_e0f7e2207a13402d90f554914dbdf428_1024x1024.jpg', 'Giày Thời Trang Nam Gosto GSM000200'),
    (3, 752000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm000900den__5__5d3f697a164c4c8bbe91809dfa5f0568_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm000900den__2__72dea16cc18242c8ac53a240c97e3d2b_1024x1024.jpg', 'Giày Thể Thao Nam Bitis BSM000900'),
    (3, 369000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsm000600trg__4__94266f8069ff4ac49686105f0b2bdd2c_large.jpg', 'https://product.hstatic.net/1000230642/product/bsm000600trg__2__dc7ce618c3f14f9283a11fbff9e3b56a_1024x1024.jpg', 'Giày Thể Thao Thông Dụng Nam Bitis Basic BSM000600');

-- Thêm sản phẩm cho category_id = 4 (Giày Chạy Bộ & Đi Bộ - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (4, 1237000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004801cam-1_d2d0d9a4870d43d8b1cbda26b2f5a2b2_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004801cam-7_d78e7e9261bf47f3a38b33be304223e1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Running LiteDual - Original Edition 2K24 HSM004801CAM'),
    (4, 1237000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004801xlc-1_c94e83bccdc64d16b4e47564337bb89d_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004801xlc-7_b04b277714894d7288870ca8b1df139b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Running LiteDual - Original Edition 2K24 HSM004801XLC'),
    (4, 742000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm007200kem__6__489a684a7a214be5904e5c29e964a3e0_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm007200kem__8__9ccc737a14514d6f84c89492b2cfc2be_master.jpg', 'Giày Thể Thao Nam Bitis Hunter Jogging HSM007200KEM'),
    (4, 1237000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004800den__5__a7f0e46bc85f4c2899855beb078d79b7_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004800den__2__11c926d4809d4b75a558634aa1156e6e_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800DEN'),
    (4, 1237000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004800cam__5__834e1e496d924b3b92660efc9012b00e_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004800cam__2__f063eea92c3f474ebafc7e154ddbdcff_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800CAM'),
    (4, 1237000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004800xmn__5__f99817881fbd4373a9d26598fa16bcb7_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004800xmn__2__4d92b38968f2437e8b3eedc58f0d0f58_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800XMN'),
    (4, 771000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/xal5_60a39d83a9f44b94beea8d935e793cf4_d634689953514bb989039313617855ce_d208fe08efdc46f296b50851d5310c57_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004900xal2_28851806f33e40a4a57ef5483d283a85_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900XAL'),
    (4, 771000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004900xam10_81c9ced300c64118bdbcb2daf901c4bc_34b61fb6d65d41059618776e707dfb62_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004900xam2_bd4b70a2d34841bd8914f4266bffa415_4da14a27503c4f2a9391c914f79a8485_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900XAM'),
    (4, 771000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm004900den10_45ba3b47620f479c94c452ef219c537e_3d81b26323724d39813f05c5c2baa9f5_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm004900den2_accdf8f324684748984064eb480bd0ba_d007d90058df4b89b81080e15ad5ac7a_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900DEN');
    
-- Thêm sản phẩm cho category_id = 5 (Giày Đá Banh - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (5, 687000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsm003600cam__4__c8f18003aac449bb8b85e9d8dde75608_large.jpg', 'https://product.hstatic.net/1000230642/product/hsm003600cam__2__ebba4c44b4b64642ae2694d0de986b86_1024x1024.jpg', 'Giày Đá Bóng Nam Bitis Hunter Football HSM003600'),
    (5, 765000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/giay-bong-da-nam-hunter-football-futsal-dsmh11100doo-do-4max6-color-do_674871fb05bf4542b60b2cf17b26081a_large.jpg', 'https://product.hstatic.net/1000230642/product/giay-bong-da-nam-hunter-football-futsal-dsmh11100doo-do-3rd0k-color-do_58fe3ad6faf34ecb9a4ce7df26c59b07_1024x1024.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football Futsal DSMH11100'),
    (5, 716000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ay-bong-da-nam-biti-s-hunter-football-dsmh09600cam-cam-v4suh-color-cam_a81bf61d42434afcb93e6d783f746f72.jpg', 'https://product.hstatic.net/1000230642/product/ay-bong-da-nam-biti-s-hunter-football-dsmh09600cam-cam-8sb58-color-cam_2276ea9bb15c43129a198cbfa46a6901_1024x1024.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football DSMH09600');

-- Thêm sản phẩm cho category_id = 6 (Giày Tây - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (6, 668000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001677nad__5__44339445bba24f36a2b6d0916c20eb5e_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001677nad__2__758d12abdebd4a8b8f528c2e884c3418_1024x1024.jpg', 'Giày Mocasin Nam Bitis BMM001677NAD'),
    (6, 668000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001677den__5__aa2201235196437584e120c2a5370dc5_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001677den__2__6639f5ab1b6941008e639bccbd97dd10_1024x1024.jpg', 'Giày Mocasin Nam Bitis BMM001677DEN'),
    (6, 786000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bvm002077den__5__4f24438dcb604c0d8ae3aac1be06efb3_large.jpg', 'https://product.hstatic.net/1000230642/product/bvm002077den__2__bbbe6a0055374fd09c3649e6b64f2b8a_1024x1024.jpg', 'Giày Tây Nam Bitis BVM002077'),
    (6, 786000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001577den__5__ec326fc91f584fbbb0803339886bf205_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001577den__2__3422bb92e90b4d7fa77b3a0ed28c2b47_1024x1024.jpg', 'Giày Tây Nam Bitis BMM001577'),
    (6, 786000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001477den__5__621ac7ea60454d62b2b58061a90a0f5a_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001477den__2__15ebfbda82e14a1da6f024f784380166_1024x1024.jpg', 'Giày Tây Nam Bitis BMM001477'),
    (6, 786000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001377den__4__fa81fa8523a5481490a1a870be69a2e5_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001377den__2__dc48f8b259bb4b0a975e79222cb9a32d_1024x1024.jpg', 'Giày Mocasin Nam Bitis BMM0013776'),
    (6, 668000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm001177den__4__6ffc295dc0bb4b1691836b6b4506fb92_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm001177den__2__3b6910d5acb1420e9c7e44cf02275984_1024x1024.jpg', 'Giày Mocasin Nam Bitis BMM001177'),
    (6, 668000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm000877den__5__52bffde8b34f4ce0b318aa4ec6461e50_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm000877den__2__aa6e76a247a84715a310120da0a3679a_1024x1024.jpg', 'Giày Tây Nam Bitis BMM000877'),
    (6, 776000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bmm000777nad5_597ceb5d5a8c4fc8a65567a0cc9f9494_large.jpg', 'https://product.hstatic.net/1000230642/product/bmm000777nad2_e9c426020acd47f49c60c412745bce6f_1024x1024.jpg', 'Giày Tây Nam Bitis BMM000777'),
    (6, 786000 , NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bvm001277nad5_b5ed014649e2453884ae5502f9a18d7c_large.jpg', 'https://product.hstatic.net/1000230642/product/bvm001277nad2_0d09517ce99e44c48b1e07dbe2b8f92c_1024x1024.jpg', 'Giày Tây Nam Bitis BVM001277');

-- Thêm sản phẩm cho category_id = 7 (Dép - MEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (7, 199000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/btm001277den__5__aec4a7afae42497589315e06593aedb0_large.jpg', 'https://product.hstatic.net/1000230642/product/btm001277den__2__bd945386ce3143f5bee748e426f9c81f_1024x1024.jpg', 'Dép Lê Nam Đơn Giản'),
    (7, 249000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/btm001277nau__5__c293b277aaf445c0aaad67f152cd87c1_large.jpg', 'https://product.hstatic.net/1000230642/product/btm001277nau__2__7be478f0dec3417dbcf9d512a692e68d_1024x1024.jpg', 'Dép Quai Ngang Nam'),
    (7, 309000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001900nau__6__1b5058aba68f4f1d9d5f8be47ddd9cb0_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm001900nau__3__6567a86862a445f7be3f6be9039c3315_1024x1024.jpg', 'Dép Lê Phong Cách Hàn Quốc'),
    (7, 359000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001900den__4__04f9f543f5b44e048e7dff9c69a2041b_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm001900den__2__95fdb91011264dfc8af991df09227db5_1024x1024.jpg', 'Dép Cao Su Thời Trang'),
    (7, 399000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_7537_3796af1f3bc84f2aa2cee5bbafb1dc28_large.jpg', 'https://product.hstatic.net/1000230642/product/ttn_7528_1cddfdccf270461e8b33493b4b0def36_1024x1024.jpg', 'Dép Lê Chống Trơn Trượt'),
    (7, 439000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_7546_bcf7dd929ca145aea08743a3fc043273_large.jpg', 'https://product.hstatic.net/1000230642/product/ttn_7538_07ead729ff7847d7b7add3df02274ad1_1024x1024.jpg', 'Dép Lê Nam Cao Cấp'),
    (7, 499000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/brm001500xam__5__23963b18902a47daa548f7905d91a56c_large.jpg', 'https://product.hstatic.net/1000230642/product/brm001500xam__2__2a07cf8f020345c9ad0cc156cf38d61d_1024x1024.jpg', 'Dép Quai Ngang Thể Thao'),
    (7, 549000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001500den__5__4af1cd11b07a4a0f9a20404d581d66e2_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm001500den__2__70252505450f429d9b6627442a905ab2_1024x1024.jpg', 'Dép Lê Đi Biển'),
    (7, 589000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpm001200den__10__db8f546d529c4c519242f8fcf63b4ef5_large.jpg', 'https://product.hstatic.net/1000230642/product/bpm001200den__2__af49f7d73b144d86b78127bf32ef50b5_1024x1024.jpg', 'Dép Da Nam Sang Trọng'),
    (7, 649000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bem001400kem__1__db10c1b0652f401c97846d6b41b01b36_large.jpg', 'https://product.hstatic.net/1000230642/product/bem001400kem__3__df68866c8edb4b4881801a9ff13e714f_1024x1024.jpg', 'Dép Lê Kiểu Dáng Trẻ Trung');

-- Thêm sản phẩm cho category_id = 8 (Hunter - WOMEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (8, 645000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw008500den__6__2448e98a4a994e058b302a4aff371d2c_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw008500den__8__9b0441f7ae72466fb60c1209427b1b2d_master.jpg', 'Hunter X Black Pink - Nữ'),
    (8, 685000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw008500xmn__9__758f40a04fa84f429ada2049b47a5982_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw008500xmn__8__c4ae952ab8e84e019e8645a86ce19440_master.jpg', 'Hunter Street Casual - Nữ'),
    (8, 735000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw004700trg__5__34cb9f80d6654accaa2b37336b21d69c_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw004700trg__6__9fc24ed845964b7d96ecc01245fa04dd_master.jpg', 'Hunter Core Lite - Nữ'),
    (8, 795000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/6_62cd54f79eae42f592ebc645a63800c7_master.jpg', 'https://product.hstatic.net/1000230642/product/5_19a8ddf299014b06a906fb7c4c2a3099_master.jpg', 'Hunter Pro Max - Nữ'),
    (8, 825000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw008600nad__5__2213b51b07ac4f209b91915550082d1c_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw008600nad__2__15eb82a1fa3248d8bbaac6c0504a71a3_master.jpg', 'Hunter Street Vibes - Nữ'),
    (8, 875000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw008600xld__4__089b3061dc7e4a789c833e51e109e8d7_master.jpg', 'https://product.hstatic.net/1000230642/product/hsm008600xld__2__5d1f40679fb5461dbf706d8632f70ae7_master.jpg', 'Hunter Liteknit - Nữ'),
    (8, 935000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw008600xal__5__2ea1c67d45914395a57fa115aee998f5_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw008600xal__2__1840336f42394075ac58c546f5d00912_master.jpg', 'Hunter Winter Edition - Nữ'),
    (8, 965000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw007801hog__2__0235d99ba386427189c0f14beb2dbcb2_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw007801hog__1__409a93d23cdb429cbd47b574bf3d41aa_master.jpg', 'Hunter Street Retro - Nữ'),
    (8, 1025000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsw002100_041c0a0ac1924856ac7453fd218eb85b_master.jpg', 'https://product.hstatic.net/1000230642/product/hsw002100_041c0a0ac1924856ac7453fd218eb85b_master.jpg', 'Hunter X Supreme - Nữ'),
    (8, 1080000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/__4__5550f0af87d849a196df74a523e5c7a6_765602483003404aabc5f186e943d466_88ec0342bbd040c89ea2e31f013b6246_master.jpg', 'https://product.hstatic.net/1000230642/product/__2__781b8bc2a6564a7394975ca44e9fe8c4_0a0e4845e4cf437cbf84ab83cf1fb42f_69c0d6a1c4894e2a960ebfaef9a6f486_master.jpg', 'Hunter Elite High Top - Nữ');

-- Thêm sản phẩm cho category_id = 9 (GOSTO - WOMEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (9, 725000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gfw019100vag4_91d5f2c92e8649708939d45ed45d59c5_large.jpg', 'https://product.hstatic.net/1000230642/product/gfw019100vag1_9ea2404fa25a49f0bfb64feb3cec4ed8_1024x1024.jpg', 'GOSTO Elegant Heels - Nữ'),
    (9, 780000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gfw019000den4_cd1789e14de9413f8ebb05d68f6aad28_cc0536ff7a6547dd8ee91d74d4622df4_large.jpg', 'https://product.hstatic.net/1000230642/product/gfw019000den2_f7f3ffddf0aa4c3d85680ce6ebd0da0b_e80498162cc648cdaed5f7d89f6151fc_1024x1024.jpg', 'GOSTO Classic Sandals - Nữ'),
    (9, 835000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/sandal-nu-gosto-gfw018688den-den-ctuqm-color-den_2a86ffdf28cc45a7a0888c0acbcf7fe0_large.jpg', 'https://product.hstatic.net/1000230642/product/sandal-nu-gosto-gfw018688den-den-qgsgz-color-den_44e3580729ab4786b8ffe5090d0ab5d9_1024x1024.jpg', 'GOSTO Stylish Flats - Nữ'),
    (9, 890000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/sandal-cao-got-nu-gosto-gfw018800doo-do-mfu4d-color-do_5a089794baeb477e9f6cd6d2911adb52_large.jpg', 'https://product.hstatic.net/1000230642/product/sandal-cao-got-nu-gosto-gfw018800doo-do-rbjze-color-do_00b923f614a14bdc996bd3bab815f222_1024x1024.jpg', 'GOSTO Comfort Wedges - Nữ'),
    (9, 945000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gsw000200kem10_bba8f0f0a6334e1ea57a79ce7adbeaae_large.jpg', 'https://product.hstatic.net/1000230642/product/gsw000200kem2_efe3d3fe1e5145d880aa726a9c6f0dfd_1024x1024.jpg', 'GOSTO Premium Boots - Nữ'),
    (9, 995000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gfw018100hog__10__c98c2c53dce9424c89564942dd025994_large.jpg', 'https://product.hstatic.net/1000230642/product/gfw018100hog__2__0379dd9a60484bd5965aa7839565482c_1024x1024.jpg', 'GOSTO Modern Loafers - Nữ'),
    (9, 1045000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gfw018788den__3__f09946761c444b6bae25d45b9541efc0_large.jpg', 'https://product.hstatic.net/1000230642/product/gfw018788den__2__46df99a480b1427ead3b0a8668d53075_1024x1024.jpg', 'GOSTO Chic Slip-ons - Nữ'),
    (9, 1090000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/gfw019200doo__10__7eaa7647ab2f4aa3bc41327d15a89334_large.jpg', 'https://product.hstatic.net/1000230642/product/gfw019200doo__2__5a72ae5e9f4d4c10922d3563ed199106_1024x1024.jpg', 'GOSTO Luxury Pumps - Nữ');

-- Thêm sản phẩm cho category_id = 10 (Êmbrace - WOMEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (10, 769000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bew002000vag__5__2cc617cf3210477bb60dd09e7a93a522_large.jpg', 'https://product.hstatic.net/1000230642/product/bew002000vag__2__5b3b53b44d104094be07eebcd01ff300_1024x1024.jpg', 'Êmbrace Elegant Sandals - Nữ'),
    (10, 819000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bew002001hog__6__d210e7a2c0b54f468f61d0434e61eec2_large.jpg', 'https://product.hstatic.net/1000230642/product/bew002001hog__3__a9d35af9759849df8bc0973d208f42eb_1024x1024.jpg', 'Êmbrace Soft Flats - Nữ'),
    (10, 869000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpw001900den4_7ee3291951cc4d0ca5ed38015d5669a4_large.jpg', 'https://product.hstatic.net/1000230642/product/bpw001900den2_2b96f4e0723145e5bc7868cc1c69af42_1024x1024.jpg', 'Êmbrace Comfort Shoes - Nữ'),
    (10, 929000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dpw070500val__5__241dab897f094817942b7b2b43a03708_large.jpg', 'https://product.hstatic.net/1000230642/product/dpw070500val__2__d560c9bbba1241988e91a752cc85a553_1024x1024.jpg', 'Êmbrace Stylish Heels - Nữ'),
    (10, 975000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/giay-the-thao-nu-biti-s-embrace-raven-dsw075400-xhq21-color-den_2426bfc7a7f94a0fafc6b20173e3af17_large.jpg', 'https://product.hstatic.net/1000230642/product/giay-the-thao-nu-biti-s-embrace-raven-dsw075400-4auzn-color-den_431a8428cde846d8b3364d34c530b459_1024x1024.jpg', 'Êmbrace Modern Wedges - Nữ'),
    (10, 1029000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsw003100vag__5__0126993b29374202a911a6d4c0855fac_large.jpg', 'https://product.hstatic.net/1000230642/product/bsw003100vag__2__21853a04c3fe4704b5bd4e427062cb85_1024x1024.jpg', 'Êmbrace Premium Sandals - Nữ'),
    (10, 1075000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsw003300trg__5__bdc0cb57316a46dfa488ea32d0ced115_large.jpg', 'https://product.hstatic.net/1000230642/product/bsw003300trg__2__d73b849e283942188ca220468fb85471_1024x1024.jpg', 'Êmbrace Classic Loafers - Nữ'),
    (10, 1132000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsw003600den__1__5fe8e44e6aec4fafb9444c83562bca04_large.jpg', 'https://product.hstatic.net/1000230642/product/bsw003600den__8__1ebbe3d00be04f989cbde3b75007b3ba_1024x1024.jpg', 'Êmbrace Chic Pumps - Nữ'),
    (10, 1187000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsw003600hog__5__044567962071450f97c436a1904ead55_large.jpg', 'https://product.hstatic.net/1000230642/product/bsw003600hog__2__512dcab2781e438181bb54ac5bb9d93a_1024x1024.jpg', 'Êmbrace High Heels - Nữ'),
    (10, 1234000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsw003600kem__5__bce9b1ad20cc4293968d1abfe3b7b9f7_large.jpg', 'https://product.hstatic.net/1000230642/product/bsw003600kem__2__66db0c7a8bb24d82b820b86ab5083b26_1024x1024.jpg', 'Êmbrace Luxury Flats - Nữ');

-- Thêm sản phẩm cho category_id = 11 (Women - WOMEN)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (11, 519000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_6901_20b90718e50f42529a520fc791567b3b_large.jpg', 'https://product.hstatic.net/1000230642/product/ttn_6899_37c2c97fa6b64479ba673ca66b941cf2_1024x1024.jpg', 'Giày Sandals Nữ Thoải Mái'),
    (11, 575000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bfw004788den__5__6cbe3c1dafa849749ba1cbfb21dc340d_large.jpg', 'https://product.hstatic.net/1000230642/product/bfw004788den__2__6cbbf3c5f394476dae002117beb64683_1024x1024.jpg', 'Dép Xỏ Ngón Nữ Thanh Lịch'),
    (11, 629000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bfw004788kem__5__3554e75a310246acae934c95667d87fd_large.jpg', 'https://product.hstatic.net/1000230642/product/bfw004788kem__2__00faf0e4ab8b413ab1d37e9f78782b86_1024x1024.jpg', 'Giày Búp Bê Nữ Dịu Dàng'),
    (11, 685000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/btw000288nau__10__e34be1cc64f74c258f894ec6e28568e3_large.jpg', 'https://product.hstatic.net/1000230642/product/btw000288nau__2__f4d4f1d3e4a84900a272adf556b418fd_1024x1024.jpg', 'Giày Cao Gót Nữ Thời Trang'),
    (11, 739000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/brw000300xng10_763a557de1314f2bbfdccd93bb995f25_large.jpg', 'https://product.hstatic.net/1000230642/product/brw000300xng2_407e7c1df270487a90cf53563732224f_1024x1024.jpg', 'Giày Lười Nữ Phong Cách'),
    (11, 795000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bfw004488kem__5__19538bd18996456f991c70554cb0813e_large.jpg', 'https://product.hstatic.net/1000230642/product/bfw004488kem__2__8acf401cbb854f048a97da73113531a1_1024x1024.jpg', 'Giày Thể Thao Nữ Năng Động'),
    (11, 845000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpw002488def__5__c9a1f509bb9247b1a6da315dd715f84a_large.jpg', 'https://product.hstatic.net/1000230642/product/bpw002488def__2__2998d5a141f04a66b10df28ebf6122e5_1024x1024.jpg', 'Giày Đế Bằng Nữ Sang Trọng'),
    (11, 899000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpw003688nau__5__079d96f43b224e7fa65316526a979384_large.jpg', 'https://product.hstatic.net/1000230642/product/bpw003688nau__2__19baaf22ffd24a0abfb8da170d1aed6d_1024x1024.jpg', 'Dép Nữ Cổ Điển'),
    (11, 945000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/btw001088den3_1f3da9f5338b4027a093976e369645b8_b6763824803948fd8c6b0e09a87cc7a8_large.jpg', 'https://product.hstatic.net/1000230642/product/btw001088den1_de86f23c0c1d4010a7f322abc67ad1ab_ea9b71624b4c426e837315a1cab9a13f_1024x1024.jpg', 'Giày Cao Gót Nữ Quyến Rũ'),
    (11, 989000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bfw001888den4_0eeee2937ee14fe9b9f5b38d940e3184_large.jpg', 'https://product.hstatic.net/1000230642/product/bfw001888den2_5f097d1265884135a67889616eb489a8_1024x1024.jpg', 'Giày Nữ Cao Cấp');

-- Thêm sản phẩm cho category_id = 12 (Giày Thể Thao - BOY)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (12, 419000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsb000501xad__6__369c516d3a8f4030a2b58af5ba131e6f_large.jpg', 'https://product.hstatic.net/1000230642/product/hsb000501xad__3__defa58629587476c864900ea2e18596a_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Cool 1'),
    (12, 465000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsb000501xdg__6__50063f7e13ad439a9cdb334dcc64eca0_large.jpg', 'https://product.hstatic.net/1000230642/product/hsb000501xdg__3__c6f4531a716840d99c5f68a9993639e5_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Cool 2'),
    (12, 519000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsb000500xad__6__304a125689bd465e8eac73146f4c277d_large.jpg', 'https://product.hstatic.net/1000230642/product/hsb000500xad__3__df2a2cb896af4e69bdb4434281464420_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Phong Cách'),
    (12, 579000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb005000cxng__5__736c1293b47f4f76861a0671fb0db03d_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb005000cxng__2__248a0e54fdf843b6a92c53bfb3a729b7_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Chạy Bộ'),
    (12, 629000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsb000501xdg__6__50063f7e13ad439a9cdb334dcc64eca0_large.jpg', 'https://product.hstatic.net/1000230642/product/hsb000501xdg__3__c6f4531a716840d99c5f68a9993639e5_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Đế Cao Su'),
    (12, 689000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsb000500xdg__6__250778b137944d018606b7d19f74fe72_large.jpg', 'https://product.hstatic.net/1000230642/product/hsb000500xdg__3__becbc27c50f14f19b93c9ca8506ded1e_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Siêu Nhẹ'),
    (12, 745000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb005100den__6__4dd7a0d51ec84cb08351ed6e61c0b23a_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb005100den__3__939ca01c9c274dd1bcdd1e8be912d7ff_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Năng Động'),
    (12, 789000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsb131900den__10__eb71e47dfb6c45cc84d2f1be2e246f51_large.jpg', 'https://product.hstatic.net/1000230642/product/dsb131900den__2__7f85ca22e1d847ec81c7985e3c8e52f6_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Mềm Mại'),
    (12, 839000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb005000doo__5__973073dbc4ff4ab09c9c03ff705ff1f5_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb005000doo__2__8d3afefa5a2a4ef3845aeed3bb665f57_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Bền Đẹp'),
    (12, 895000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsb139101xnh__5__b85c7f935981441a879c6703d3cc6350_large.jpg', 'https://product.hstatic.net/1000230642/product/dsb139101xnh__2__4e2f315d39e94f4bbcf93bde033d964e_1024x1024.jpg', 'Giày Thể Thao Bé Trai - Thoáng Khí');

-- Thêm sản phẩm cho category_id = 13 (Sandal - BOY)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (13, 319000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003200xlc__4__af6daa967a9546aba90d5687cb079d67_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003200xlc__6__01f585b80f284a1da38adfbbb368e185_1024x1024.jpg', 'Sandal Bé Trai - Phong Cách 1'),
    (13, 365000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003200xam__3__39f5894a4b7b472696be0bda1bcdadc9_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003200xam__5__88f8029b161f464c9638fc7204443388_1024x1024.jpg', 'Sandal Bé Trai - Phong Cách 2'),
    (13, 419000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb002201reu__4__ebadcefa46c544d0bf0aeb7529ee99ef_large.jpg', 'https://product.hstatic.net/1000230642/product/beb002201reu__2__a891ee3b5ae3483fa95de08f8196d19c_1024x1024.jpg', 'Sandal Bé Trai - Chống Trơn'),
    (13, 475000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb002201den__5__a09a291d07814f339a9da1a4c7579780_large.jpg', 'https://product.hstatic.net/1000230642/product/beb002201den__3__3fa70ced2d1e42529a529a13ad4edd09_1024x1024.jpg', 'Sandal Bé Trai - Thoáng Khí'),
    (13, 529000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpb001000den__5__70ff39af0ee44be3b8f44ef5453cab53_large.jpg', 'https://product.hstatic.net/1000230642/product/bpb001000den__2__9cc1a2d9fe5c4e37beb6460a48f4f4bb_1024x1024.jpg', 'Sandal Bé Trai - Năng Động'),
    (13, 585000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003000xam__5__245ec27dd08a49f8a99c3e91878e96a4_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003000xam__2__89d7975122a946f2968dae7b9d210d17_1024x1024.jpg', 'Sandal Bé Trai - Dáng Thể Thao'),
    (13, 639000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpb001000nau__4__dc636c8158d54cba8731dd3e68c3966c_large.jpg', 'https://product.hstatic.net/1000230642/product/bpb001000nau__2__70b85b48323e41cb8ab8cca82641e939_1024x1024.jpg', 'Sandal Bé Trai - Dây Bền Đẹp'),
    (13, 689000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003000xlc__4__eab20c23cede472689e301788ac153f1_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003000xlc__2__4260cdcf1dbe49b6b776dc6d4505d586_1024x1024.jpg', 'Sandal Bé Trai - Đế Êm'),
    (13, 745000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb002900xam__1__3d39c883d93e4256b434e938393bbb35_large.jpg', 'https://product.hstatic.net/1000230642/product/beb002900xam__6__70a06ecfc016481cb182e43af89ccdda_1024x1024.jpg', 'Sandal Bé Trai - Chống Nước'),
    (13, 799000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb002900xdg__1__920449fab7364b5cbc164bcb4bc20d18_large.jpg', 'https://product.hstatic.net/1000230642/product/beb002900xdg__6__fae07c63206a400694cd9d6a6d60bb67_1024x1024.jpg', 'Sandal Bé Trai - Phong Cách 3');

-- Thêm sản phẩm cho category_id = 14 (Dép - BOY)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (14, 245000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpb000700den__5__85c5be7801d241eaa1f10a167b790a50_large.jpg', 'https://product.hstatic.net/1000230642/product/bpb000700den__2__851e659376f84893ac41020e8ec9ee00_1024x1024.jpg', 'Dép quai ngang bé trai - EBY.22'),
    (14, 295000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bpb000700xdd__6__c3eeb2edf1a0466183c12bb48218da21_large.jpg', 'https://product.hstatic.net/1000230642/product/bpb000700xdd__3__da4876300173423aa3e5838608412ae8_1024x1024.jpg', 'Dép sục bé trai - DEVA.01'),
    (14, 335000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003697xnh__5__5a9c9426f72a4613a677a335ce962e2d_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003697xnh__2__f3486abe8db84e93ad09244ddab38127_1024x1024.jpg', 'Giày thể thao bé trai - GVBT.94'),
    (14, 385000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb003897kem__5__75dba77e14fc4f688c9b46e7509f3d56_large.jpg', 'https://product.hstatic.net/1000230642/product/beb003897kem__2__754ed8c6fe77416994c5ea644d1adff9_1024x1024.jpg', 'Dép quai hậu bé trai - EBY.21'),
    (14, 445000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/deb009201den__10__a9dbc1116b874fe3a90c51e3809ab224_large.jpg', 'https://product.hstatic.net/1000230642/product/deb009201den__2__92125de89a9c48afb1b3386a5e70126c_1024x1024.jpg', 'Dép xỏ ngón bé trai - EBY.20'),
    (14, 495000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb001801cam__4__e6789e28dcb44902accb7b0131b1e7fe_large.jpg', 'https://product.hstatic.net/1000230642/product/beb001801cam__2__0fcd317489ce42868505829e3d3020b2_1024x1024.jpg', 'Dép sandal bé trai - EBY.19'),
    (14, 545000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb000300doo3_feb234d5aa134d6a8958606b7c16829a_large.jpg', 'https://product.hstatic.net/1000230642/product/beb000300doo2_bc3c432967d94877b84ac7a6179d4b5a_1024x1024.jpg', 'Dép bít mũi bé trai - EBY.18'),
    (14, 595000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beb001800xam1_040bf07ffc8d40259153f9f030d864da_1024x1024.jpg', 'https://product.hstatic.net/1000230642/product/beb001800xam1_040bf07ffc8d40259153f9f030d864da_1024x1024.jpg', 'Dép lưới bé trai - EBY.17'),
    (14, 645000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_2948_bc594c5900324de398ad3183d00192ce_medium.jpg', 'https://product.hstatic.net/1000230642/product/ttn_2940_4063fab052b2461eb8d1a6ed9742a862_1024x1024.jpg', 'Dép cao su bé trai - EBY.16'),
    (14, 695000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dep-eva-be-trai-deb009200xdd-xanh-duong-dam-k2aen-color-xanh-duong-dam_7365cf8d6a54497fb2f48671e5b7b113_large.jpg', 'https://product.hstatic.net/1000230642/product/dep-eva-be-trai-deb009200xdd-xanh-duong-dam-eg83q-color-xanh-duong-dam_d975da838acb445c8025d2bb4176620c_1024x1024.jpg', 'Dép nhựa bé trai - EBY.15');

-- Thêm sản phẩm cho category_id = 15 (Giày Tập Đi - BOY)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (15, 196000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb003000xdg3_085e177fcce04a228269eebbf4a0eb23_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb003000xdg2_7fe01fbe1fe5423d9e998ef7c79b2c4f_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSB003000'),
    (15, 378000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsc_0024_d000063b4d7f47a1968fc928f196673c_large.jpg', 'https://product.hstatic.net/1000230642/product/dsc_0022_08d3905336cc45139bef880b73b8facd_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSB006200XDG'),
    (15, 378000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006200xng-a_edff00aa15324e978778916e8a8486c4_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006200xng-c_db848459876b4ce68b1d5c278bc83df5_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSB006200XNG'),
    (15, 207000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006300xmn__4__5917b1c8d6344fdaabe83fa6435b7d07_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006300xmn__6__5dd5ffd8570c4ab5a294eda59c658030_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSB006300XMN'),
    (15, 207000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006300xnh-b_cfa9900bdfad44c381249909d3571127_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006300xnh-a_8b28666d16be499d857f1b304bcdd7f8_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSB006300XNH'),
    (15, 378000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsc_0003_05de471764f64b86afc0a472f2bb900d_large.jpg', 'https://product.hstatic.net/1000230642/product/dsc_0002_d15a32b0a60f4bb9bee296202c10a3b6_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSG006200CAM'),
    (15, 378000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006200hog-a_90b9df8802a34de7b74c4cf3fee2decc_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006200hog-c__1__3dae1fd688544d598aa7d4eded30a187_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSG006200HOG'),
    (15, 207000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006300hog-b_46c68d4af29e42b594132dcd1040d36d_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006300hog-a_8b6b25712fe24643a3e310efa6d965ae_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSG006300HOG'),
    (15, 207000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006300xdg-b_a6e364adaa4849e8be888d0fcdb63897_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006300xdg-a_e04afce540da4c4ba7c8965298b73ecb_1024x1024.jpg', 'Giày Tập Đi Trẻ Em Bitis BSG006300XDG');
    
-- Thêm sản phẩm cho category_id = 16 (Giày Búp Bê - GIRL)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (16, 490000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bbg000800hog__3__4a23ba295a534c7b99fce5d6a00f450d_large.jpg', 'https://product.hstatic.net/1000230642/product/bbg000800hog__8__a348087d8c5f4c4b88c084f4fd91ce2c_1024x1024.jpg', 'Giày Búp Bê Bé Gái Bitis BBG000800HOG'),
    (16, 315000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_6610_bd5dbea4511841d9904cfb77a714c6a6_large.jpg', 'https://product.hstatic.net/1000230642/product/ttn_6609_6fa0023e8ed84590988f05e635094c7b_1024x1024.jpg', 'Giày Búp Bê Bé Gái BBG000200');

-- Thêm sản phẩm cho category_id = 17 (Giày Thể Thao - GIRL)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (17, 369000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsg000501til__6__c04eb61eba2b495e8086a675420267a1_large.jpg', 'https://product.hstatic.net/1000230642/product/hsg000501til__3__e9acaf34c64d4a5bb26119df98c4eb8b_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Cool Girl 1'),
    (17, 429000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsg000501trg__1__dcb11ec61767484fbc5e1afe25856a57_large.jpg', 'https://product.hstatic.net/1000230642/product/hsg000501trg__8__ef6740a672a547308d02c757bbbb7512_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Cool Girl 2'),
    (17, 499000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsg000500trg__6__f7df134a37484e8c8e2258051175ad5a_large.jpg', 'https://product.hstatic.net/1000230642/product/hsg000500trg__3__9ec87402cce14fcfbc6a21e2edd2c868_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Sport Girl 3'),
    (17, 529000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/hsg000500til__6__92075a36afa645b5aea1f714d8e4c04c_large.jpg', 'https://product.hstatic.net/1000230642/product/hsg000500til__3__1633f7ebd65244b6a63426c36aae0120_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Sport Girl 4'),
    (17, 569000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg004200xal__6__18f5481ddb4a4a248f78260c68bf1cc1_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg004200xal__3__d85b444a2d7b4ab9bbefdfc91bb8b738_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Sport Girl 5'),
    (17, 599000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg004200cam__5__ae59d2ae8db741db976d30dd9dbba09c_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg004200cam__2__f5ec892337fe43db96bfb000b248163b_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Active Girl 6'),
    (17, 649000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsg139101xdl__5__898ced365a944fcc8173e6ec3ae640e3_large.jpg', 'https://product.hstatic.net/1000230642/product/dsg139101xdl__2__40952392978a499eb2cd2b9940f548fe_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Active Girl 7'),
    (17, 699000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006101cam__3__4ce80a5e02a14759a180b19f8f0ea0f5_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006101cam__5__8e9e8b0f55e84f79bd94afd586c230fb_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Dynamic Girl 8'),
    (17, 749000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006100vag__3__6a7142a59e2f4a0faa2a038d3d532e7b_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006100vag__5__a3be9f4cb9994d178a2ba4107db69752_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Dynamic Girl 9'),
    (17, 799000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006100trg__4__6bc90c6201d54d81a07c8d1387a279b2_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006100trg__6__728a15a995024fa7959b2bf680d0b12c_1024x1024.jpg', 'Giày Thể Thao Bitis Hunter Energy Girl 10');

-- Thêm sản phẩm cho category_id = 18 (Sandals - GIRL)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (18, 350000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg003301hog__6__52366a4b212645459b6fd500eb0e196c_large.jpg', 'https://product.hstatic.net/1000230642/product/beg003301hog__3__e3b6367388ea482086f6d385223d9fee_1024x1024.jpg', 'Sparkling Sandals'),
    (18, 370000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg003300trg__5__5a5616ee035244328a47ef3826e13fd3_large.jpg', 'https://product.hstatic.net/1000230642/product/beg003301hog__6__52366a4b212645459b6fd500eb0e196c_large.jpg', 'Rainbow Sandals'),
    (18, 390000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg003300kem__5__088ebc1b59d346f5856c8ddf8905aa4e_large.jpg', 'https://product.hstatic.net/1000230642/product/beg003300kem__3__93322633e24c45a19db90e964c988f4c_1024x1024.jpg', 'Floral Sandals'),
    (18, 420000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg002201xdg__6__1fd8dd7629f241e081d33ec429962d81_large.jpg', 'https://product.hstatic.net/1000230642/product/beg002201xdg__3__90ca7508cb134006856c14101228b5e1_1024x1024.jpg', 'Ocean Breeze Sandals'),
    (18, 450000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg002201tim__6__fd8450acbe4341e7a75e741205b5297f_large.jpg', 'https://product.hstatic.net/1000230642/product/beg002201tim__3__08074a6550344a7cb29e54203546517f_1024x1024.jpg', 'Summer Fun Sandals'),
    (18, 480000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg003000vag__5__d04198468e6b489db6f12bb460718669_large.jpg', 'https://product.hstatic.net/1000230642/product/beg003000vag__2__92bb72ebf075499aaa10bd468b13a2db_1024x1024.jpg', 'Sunshine Sandals'),
    (18, 510000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg003000xdl__4__3a7005b1a4c842c3acdfc7ffd4dd6aae_large.jpg', 'https://product.hstatic.net/1000230642/product/beg003000xdl__2__036cb204398b43e7bdecd999fb38751d_1024x1024.jpg', 'Twinkle Toes Sandals'),
    (18, 540000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg002800hog__10__7596d1e9ba104b05b1c8a77c10ae23b8_large.jpg', 'https://product.hstatic.net/1000230642/product/beg002800hog__2__27b0696e568146149912416d88fbb028_1024x1024.jpg', 'Dreamy Sandals'),
    (18, 570000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/heg000100xlc__5__202276e71f8a4d40b7722c35152c545d_large.jpg', 'https://product.hstatic.net/1000230642/product/heg000100xlc__2__62570136573a4266aed88a4e707bf01e_1024x1024.jpg', 'Fairy Tale Sandals'),
    (18, 600000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg002100hog__10__6cb904bc938540fb91899bd4799de788_large.jpg', 'https://product.hstatic.net/1000230642/product/beg002100hog__2__93a67bdd74cd41bbb36a9d0e79b2dd41_1024x1024.jpg', 'Adventure Sandals');

-- Thêm sản phẩm cho category_id = 19 (Dép bé gái - GIRL)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (19, 119000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg001801vag__3__ece61c35e1584849a9ff62e5b2fb4718_large.jpg', 'https://product.hstatic.net/1000230642/product/beg001801vag__2__1f339d6856974ba3ac4df1471d1ddac1_1024x1024.jpg', 'Princess Slippers'),
    (19, 149000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/9f4a7604-1d_dad97021233f4887890f26409246223d_large.jpg', 'https://product.hstatic.net/1000230642/product/beg002300kem__2__08280b07d054425b89f26d57fed8023a_1024x1024.jpg', 'Dreamland Slippers'),
    (19, 179000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg001800hog9_58c6e060fd804734be4305dbe891150f_large.jpg', 'https://product.hstatic.net/1000230642/product/beg001800hog1_bb501731df064249ac0b76fef47f854d_1024x1024.jpg', 'Fairy Slippers'),
    (19, 199000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/beg000997xng__5__09d79fc7d3d84b0287cabe6febb2bc56_large.jpg', 'https://product.hstatic.net/1000230642/product/beg000997xng__2__edb29231d995487ca6a67778cda4ff44_1024x1024.jpg', 'Magic Slippers'),
    (19, 219000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/un-be-gai-biti-s-disney-beg000597xdg-xanh-duong-vmceg-color-xanh-duong_7347e243ac314e6db005692bcbbf98d0_large.jpg', 'https://product.hstatic.net/1000230642/product/un-be-gai-biti-s-disney-beg000597xdg-xanh-duong-9b7mk-color-xanh-duong_cf9bfc11b7f84d6c9122e3c5bf4bcaaa_1024x1024.jpg', 'Sunshine Slippers'),
    (19, 249000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dep-eva-phun-be-gai-biti-s-deg009100vag-vang-ftifc-color-vang_821572cf7e854f7eadb6e77fb18712cf_large.jpg', 'https://product.hstatic.net/1000230642/product/dep-eva-phun-be-gai-biti-s-deg009100vag-vang-lpjt4-color-vang_517c2ac252654a708bfba41b49259cca_1024x1024.jpg', 'Twinkle Slippers'),
    (19, 279000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dep-eva-phun-be-gai-biti-s-disney-deg009811vag-vang-7v5q9-color-vang_245f27f9a9e24041bc6ed07268361a91_large.jpg', 'https://product.hstatic.net/1000230642/product/dep-eva-phun-be-gai-biti-s-disney-deg009811vag-vang-02zzh-color-vang_cc2edc4eb3c84af2a85a0fde6206b9cc_1024x1024.jpg', 'Adventure Slippers'),
    (19, 299000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/slg010400hog__5__e702a47fec854c6fafc59826d0ad15ea_large.jpg', 'https://product.hstatic.net/1000230642/product/slg010400hog__1__b3e1e4541a374150a37cbb8dc6c74711_1024x1024.jpg', 'Rainbow Slippers'),
    (19, 319000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/ttn_7452_8bd34fe2da8b44868fece14cc663e2c5_large.jpg', 'https://product.hstatic.net/1000230642/product/ttn_7451_0f7573cef5db4d06a58eb895f517c53f_1024x1024.jpg', 'Floral Slippers');

-- Thêm sản phẩm cho category_id = 20 (Giày Tập Đi - GIRL)
INSERT INTO products (category_id, price, created_at, updated_at, image_dynamic_url, image_static_url, name)
VALUES
    (20, 289000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb003000xdg3_085e177fcce04a228269eebbf4a0eb23_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb003000xdg2_7fe01fbe1fe5423d9e998ef7c79b2c4f_1024x1024.jpg', 'First Steps Shoes'),
    (20, 339000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsc_0024_d000063b4d7f47a1968fc928f196673c_large.jpg', 'https://product.hstatic.net/1000230642/product/dsc_0022_08d3905336cc45139bef880b73b8facd_1024x1024.jpg', 'Toddler Trainers'),
    (20, 389000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006200xng-a_edff00aa15324e978778916e8a8486c4_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006200xng-c_db848459876b4ce68b1d5c278bc83df5_1024x1024.jpg', 'Baby Walkers'),
    (20, 439000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006300xmn__4__5917b1c8d6344fdaabe83fa6435b7d07_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006300xmn__6__5dd5ffd8570c4ab5a294eda59c658030_1024x1024.jpg', 'Tiny Sneakers'),
    (20, 489000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsb006300xnh-b_cfa9900bdfad44c381249909d3571127_large.jpg', 'https://product.hstatic.net/1000230642/product/bsb006300xnh-a_8b28666d16be499d857f1b304bcdd7f8_1024x1024.jpg', 'Little Runners'),
    (20, 539000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/dsc_0003_05de471764f64b86afc0a472f2bb900d_large.jpg', 'https://product.hstatic.net/1000230642/product/dsc_0002_d15a32b0a60f4bb9bee296202c10a3b6_1024x1024.jpg', 'Mini Boots'),
    (20, 589000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006200hog-a_90b9df8802a34de7b74c4cf3fee2decc_large.jpg', 'https://product.hstatic.net/1000230642/product/dsc_0003_05de471764f64b86afc0a472f2bb900d_large.jpg', 'Cute Crawlers'),
    (20, 639000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006300hog-b_46c68d4af29e42b594132dcd1040d36d_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006300hog-a_8b6b25712fe24643a3e310efa6d965ae_1024x1024.jpg', 'First Adventure Shoes'),
    (20, 689000, NOW(), NOW(), 'https://product.hstatic.net/1000230642/product/bsg006300xdg-b_a6e364adaa4849e8be888d0fcdb63897_large.jpg', 'https://product.hstatic.net/1000230642/product/bsg006300xdg-a_e04afce540da4c4ba7c8965298b73ecb_1024x1024.jpg', 'Tiny Toes Shoes');
    

INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    -- Biến thể cho product_id = 1
    (1, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Navy Blue - Size 40', '40'),
    (1, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Navy Blue - Size 41', '41'),
    (1, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Navy Blue - Size 42', '42'),
    (1, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Gray - Size 40', '40'),
    (1, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Gray - Size 41', '41'),
    (1, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - Gray - Size 42', '42'),
    (1, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm008500den__8__4a7ff19c085b4bacb78c0670cb357707_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - White - Size 40', '40'),
    (1, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm008500den__8__4a7ff19c085b4bacb78c0670cb357707_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - White - Size 41', '41'),
    (1, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm008500den__8__4a7ff19c085b4bacb78c0670cb357707_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Tennis - White - Size 42', '42'),

    -- Biến thể cho product_id = 2
    (2, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (2, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (2, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm008500xnh__8__c9e5053380dc4cadb44282eae485008b_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (2, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (2, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (2, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008500xam__8__8b1addb2522540b183691aa98ebb7720_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (2, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm002900den__2__023f92cb59cc4ee9be579052ed260f1d_a933875b43134df5a930b33796d2faf1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (2, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm002900den__2__023f92cb59cc4ee9be579052ed260f1d_a933875b43134df5a930b33796d2faf1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (2, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm002900den__2__023f92cb59cc4ee9be579052ed260f1d_a933875b43134df5a930b33796d2faf1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 3
    (3, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004700xnh1_1973d769316c4847882c6ff3a71a518e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (3, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004700xnh1_1973d769316c4847882c6ff3a71a518e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (3, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004700xnh1_1973d769316c4847882c6ff3a71a518e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (3, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004900xal2_28851806f33e40a4a57ef5483d283a85_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (3, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004900xal2_28851806f33e40a4a57ef5483d283a85_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (3, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004900xal2_28851806f33e40a4a57ef5483d283a85_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (3, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004900den2_accdf8f324684748984064eb480bd0ba_d007d90058df4b89b81080e15ad5ac7a_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (3, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004900den2_accdf8f324684748984064eb480bd0ba_d007d90058df4b89b81080e15ad5ac7a_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (3, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004900den2_accdf8f324684748984064eb480bd0ba_d007d90058df4b89b81080e15ad5ac7a_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 4
    (4, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004400xnh1_f5210b97f1de447aafb2c7aee4843089_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (4, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004400xnh1_f5210b97f1de447aafb2c7aee4843089_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (4, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004400xnh1_f5210b97f1de447aafb2c7aee4843089_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (4, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004400xam1_4508f26648ad417d90305128037b53bf_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (4, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004400xam1_4508f26648ad417d90305128037b53bf_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (4, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm004400xam1_4508f26648ad417d90305128037b53bf_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (4, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004401den1_70d2784538c7499d991efda022df820c_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (4, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004401den1_70d2784538c7499d991efda022df820c_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (4, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004401den1_70d2784538c7499d991efda022df820c_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 5
    (5, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (5, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (5, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (5, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008000xam__2__d73ab19559ad4093843244123decc805_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (5, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008000xam__2__d73ab19559ad4093843244123decc805_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (5, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm008000xam__2__d73ab19559ad4093843244123decc805_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (5, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__2__12eda5b240194c20a4ad34f41e8c2afd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (5, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__2__12eda5b240194c20a4ad34f41e8c2afd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (5, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__2__12eda5b240194c20a4ad34f41e8c2afd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),
    
    -- Biến thể cho product_id = 6
    (6, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007500xdl__2__03d7ff9f1e4c40f78a0336b599c118db_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (6, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007500xdl__2__03d7ff9f1e4c40f78a0336b599c118db_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (6, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007500xdl__2__03d7ff9f1e4c40f78a0336b599c118db_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (6, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007500trg__2__f8ebc67cd4264fb785b1666adb667524_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (6, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007500trg__2__f8ebc67cd4264fb785b1666adb667524_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (6, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007500trg__2__f8ebc67cd4264fb785b1666adb667524_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (6, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007503den-7_28fafb0b299f4b0e9744c1d24d0df891_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (6, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007503den-7_28fafb0b299f4b0e9744c1d24d0df891_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (6, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007503den-7_28fafb0b299f4b0e9744c1d24d0df891_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 7
    (7, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (7, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (7, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm007200xdg__2__a6ba4df73745463590cef23742e51b20_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (7, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007200kem__4__1a89ab807ece474ebdf53e567f0daf7e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (7, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007200kem__4__1a89ab807ece474ebdf53e567f0daf7e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (7, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007200kem__4__1a89ab807ece474ebdf53e567f0daf7e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (7, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__3__b3293ab654b948cfa9722c38bf4fb6d1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (7, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__3__b3293ab654b948cfa9722c38bf4fb6d1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (7, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm007200den__3__b3293ab654b948cfa9722c38bf4fb6d1_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 8
    (8, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/nam-hunter-x-x-nite-22-collection-dsmh10500trg-trang-dtg6p-color-trang_2da6ea410e2a417fac0e0b5145f1098a_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 40', '40'),
    (8, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/nam-hunter-x-x-nite-22-collection-dsmh10500trg-trang-dtg6p-color-trang_2da6ea410e2a417fac0e0b5145f1098a_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 41', '41'),
    (8, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/nam-hunter-x-x-nite-22-collection-dsmh10500trg-trang-dtg6p-color-trang_2da6ea410e2a417fac0e0b5145f1098a_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 42', '42'),
    (8, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500xam-xam-wo1dc-color-xam_1acbb8ed27b94573aa45e94d11c4722d_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (8, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500xam-xam-wo1dc-color-xam_1acbb8ed27b94573aa45e94d11c4722d_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (8, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500xam-xam-wo1dc-color-xam_1acbb8ed27b94573aa45e94d11c4722d_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (8, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500den-den-06o1s-color-den_c2877e8fa1844ce2acb3b1457fb7cbf4_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (8, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500den-den-06o1s-color-den_c2877e8fa1844ce2acb3b1457fb7cbf4_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (8, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hao-nam-hunter-x-x-nite-22-collection-dsmh10500den-den-06o1s-color-den_c2877e8fa1844ce2acb3b1457fb7cbf4_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),
    
    -- Biến thể cho product_id = 9
    (9, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm006500trg__2__16d476172e5b4a43919d564357f67eaf_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 40', '40'),
    (9, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm006500trg__2__16d476172e5b4a43919d564357f67eaf_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 41', '41'),
    (9, 10, NOW(), NOW(), 'White', 'https://product.hstatic.net/1000230642/product/hsm006500trg__2__16d476172e5b4a43919d564357f67eaf_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - White - Size 42', '42'),
    (9, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007504trg-7_68d9edca6c354d18a06445c84524b9dd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 40', '40'),
    (9, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007504trg-7_68d9edca6c354d18a06445c84524b9dd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 41', '41'),
    (9, 10, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hsm007504trg-7_68d9edca6c354d18a06445c84524b9dd_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Gray - Size 42', '42'),
    (9, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsw004206reu2_f7ba78afb3c24addb0160d00bbb4d0c9_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (9, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsw004206reu2_f7ba78afb3c24addb0160d00bbb4d0c9_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (9, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsw004206reu2_f7ba78afb3c24addb0160d00bbb4d0c9_1024x1024.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42'),

    -- Biến thể cho product_id = 10
    (10, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004800xmn__2__4d92b38968f2437e8b3eedc58f0d0f58_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 40', '40'),
    (10, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004800xmn__2__4d92b38968f2437e8b3eedc58f0d0f58_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 41', '41'),
    (10, 10, NOW(), NOW(), 'Navy Blue', 'https://product.hstatic.net/1000230642/product/hsm004800xmn__2__4d92b38968f2437e8b3eedc58f0d0f58_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Navy Blue - Size 42', '42'),
    (10, 10, NOW(), NOW(), 'Orance', 'https://product.hstatic.net/1000230642/product/hsm004800cam__2__f063eea92c3f474ebafc7e154ddbdcff_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Orance - Size 40', '40'),
    (10, 10, NOW(), NOW(), 'Orance', 'https://product.hstatic.net/1000230642/product/hsm004800cam__2__f063eea92c3f474ebafc7e154ddbdcff_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Orance - Size 41', '41'),
    (10, 10, NOW(), NOW(), 'Orance', 'https://product.hstatic.net/1000230642/product/hsm004800cam__2__f063eea92c3f474ebafc7e154ddbdcff_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Orance - Size 42', '42'),
    (10, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004800den__2__11c926d4809d4b75a558634aa1156e6e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 40', '40'),
    (10, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004800den__2__11c926d4809d4b75a558634aa1156e6e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 41', '41'),
    (10, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004800den__2__11c926d4809d4b75a558634aa1156e6e_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter - Black - Size 42', '42');

INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    (11, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/r-americano-demh00400-ner4b-color-den_26848780da6b48318abb61a422435ad8_f8b135c14b0d48449b9a859de169a63b_master.jpg', 'Sandal Nam Bitis Hunter Tonic DEMH00400DEN', 40),  -- M -> 40
    (12, 10, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/00400cam__2__702532fd22234aecb4c155e8144d76f4_fd40af88554a4b6384a6786f1db258c0_master.jpg', 'Sandal Nam Bitis Hunter Tonic DEMH00400CAM', 41),  -- L -> 41
    (13, 15, NOW(), NOW(), 'Brown', 'https://product.hstatic.net/1000230642/product/bpm002400nau__5__33634851c0db42efaaa90b78d9fc581d_large.jpg', 'Sandal Nam Bitis BPM002400NAU', 42),  -- XL -> 42
    (14, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bdm001877den__5__c8172feefd71433fb51c5c9be2be6009_large.jpg', 'Sandal Nam Bitis BDM001877DEN', 39),  -- M -> 39
    (15, 20, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bdm001877nad__5__bd4b0954ebc54315b1ea9d59575d490f_large.jpg', 'Sandal Nam Bitis BDM001877NAD', 43),  -- L -> 43
    (16, 25, NOW(), NOW(), 'Gray', 'https://product.hstatic.net/1000230642/product/hem000800xam__5__038c8db445964cdf8a9249d9e301b360_master.jpg', 'Sandal Nam Biti’s Hunter X Dune Coastal Edition HEM000800XAM', 40),  -- XL -> 40
    (17, 15, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bpm001800nad__6__06b39cad240848e19c0dcc22974abbf7_large.png', 'Sandal Nam Bitis BPM001800NAD', 41),  -- M -> 41
    (18, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bpm001800den__5__64b787c393aa4e5c93e3ae11879eb1b6_large.png', 'Sandal Nam Bitis BPM001800DEN', 42),  -- M -> 42
    (19, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bpm002401den__5__065682c6852743f8938420cea13f18e0_large.jpg', 'Sandal Nam Bitis BPM002401DEN', 39),  -- L -> 39
    (20, 10, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/hem000900xnh__3__d141c6b6548a47b4a1326175700eac78_2187e14cf8544d20baa3d8797505ff9f_master.jpg', 'Sandal Nam Bitis Hunter HEM000900XNH', 43);  -- XL -> 43
    
    -- Thêm thông tin sản phẩm cho category_id = 3 (Giày Thể Thao - MEN)
INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    (21, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bsm004000xnh__5__93b17d7fc4964d4daef1816502061fc9_large.jpg', 'Giày Thể Thao Nam Bitis BSM004000XNH', 40),
    (22, 10, NOW(), NOW(), 'Blue', 'https://product.hstatic.net/1000230642/product/bsm004000xam__5__247e2ae7504b4e0d8f8704880be8fd32_large.jpg', 'Giày Thể Thao Nam Bitis BSM004000XAM', 41),
    (23, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bsm004000den__5__dc903581759a474fb89db7222591a7ff_large.jpg', 'Giày Thể Thao Nam Bitis BSM004000DEN', 42),
    (24, 15, NOW(), NOW(), 'Green', 'https://product.hstatic.net/1000230642/product/003900trg__6__9863635118384093b19ad4487ea63c9a_large.jpg', 'Giày Thể Thao Thông Dụng Nam Bitis BSM003900', 43),
    (25, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bsm000701den__5__70de738e494245e284c7a157207b11ea_large.jpg', 'Giày Thể Thao Nam Bitis BSM000701', 40),
    (26, 25, NOW(), NOW(), 'Beige', 'https://product.hstatic.net/1000230642/product/bsm002900kem__4__1a5f464b89c04bbbad3aae77f2727188_9e9efdcfbc7546c6b05f9a8478f375f9_large.jpg', 'Giày Thông Dụng Eva Phun Nam Bitis E-Flow BSM002900', 41),
    (27, 30, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bsm002300xnh10_5c88be8f415f4f7d838889b2aa019e29_large.jpg', 'Giày Thể Thao Nam Bitis BSM002300', 42),
    (28, 10, NOW(), NOW(), 'Brown', 'https://product.hstatic.net/1000230642/product/gsm000200nau10_265e6f8c4b174c6291e5268a973cea59_230a17a58ffe452a9395cbb419455a8d_large.jpg', 'Giày Thời Trang Nam Gosto GSM000200', 43),
    (29, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bsm000900den__5__5d3f697a164c4c8bbe91809dfa5f0568_large.jpg', 'Giày Thể Thao Nam Bitis BSM000900', 40),
    (30, 20, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/bsm000600trg__4__94266f8069ff4ac49686105f0b2bdd2c_large.jpg', 'Giày Thể Thao Thông Dụng Nam Bitis Basic BSM000600', 41);
    
-- Thêm thông tin sản phẩm cho category_id = 4 (Giày Chạy Bộ & Đi Bộ - MEN)
INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    (31, 10, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/hsm004801cam-1_d2d0d9a4870d43d8b1cbda26b2f5a2b2_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Running LiteDual - Original Edition 2K24 HSM004801CAM', 40),
    (32, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004801xlc-1_c94e83bccdc64d16b4e47564337bb89d_master.jpg', 'Giày Thể Thao Nam Biti’s Hunter Running LiteDual - Original Edition 2K24 HSM004801XLC', 41),
    (33, 15, NOW(), NOW(), 'Beige', 'https://product.hstatic.net/1000230642/product/hsm007200kem__6__489a684a7a214be5904e5c29e964a3e0_master.jpg', 'Giày Thể Thao Nam Bitis Hunter Jogging HSM007200KEM', 42),
    (34, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004800den__5__a7f0e46bc85f4c2899855beb078d79b7_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800DEN', 43),
    (35, 25, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/hsm004800cam__5__834e1e496d924b3b92660efc9012b00e_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800CAM', 40),
    (36, 30, NOW(), NOW(), 'Blue', 'https://product.hstatic.net/1000230642/product/hsm004800xmn__5__f99817881fbd4373a9d26598fa16bcb7_master.jpg', 'Giày Chạy Bộ Nam Bitis Hunter Running 2.0 HSM004800XMN', 41),
    (37, 10, NOW(), NOW(), 'Light Blue', 'https://product.hstatic.net/1000230642/product/xal5_60a39d83a9f44b94beea8d935e793cf4_d634689953514bb989039313617855ce_d208fe08efdc46f296b50851d5310c57_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900XAL', 42),
    (38, 15, NOW(), NOW(), 'Red', 'https://product.hstatic.net/1000230642/product/hsm004900xam10_81c9ced300c64118bdbcb2daf901c4bc_34b61fb6d65d41059618776e707dfb62_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900XAM', 43),
    (39, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/hsm004900den10_45ba3b47620f479c94c452ef219c537e_3d81b26323724d39813f05c5c2baa9f5_master.jpg', 'Giày Thể Thao Nam BITI’S HUNTER JOGGING FESTIVE: PLUTON COLLECTION HSM004900DEN', 40);

-- Thêm thông tin sản phẩm cho category_id = 5 (Giày Đá Banh - MEN)
INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    (40, 10, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/hsm003600cam__4__c8f18003aac449bb8b85e9d8dde75608_large.jpg', 'Giày Đá Bóng Nam Bitis Hunter Football HSM003600', 40),
    (40, 10, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/hsm003600cam__4__c8f18003aac449bb8b85e9d8dde75608_large.jpg', 'Giày Đá Bóng Nam Bitis Hunter Football HSM003600', 41),
    (40, 10, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/hsm003600cam__4__c8f18003aac449bb8b85e9d8dde75608_large.jpg', 'Giày Đá Bóng Nam Bitis Hunter Football HSM003600', 42),
    (41, 15, NOW(), NOW(), 'Red', 'https://product.hstatic.net/1000230642/product/giay-bong-da-nam-hunter-football-futsal-dsmh11100doo-do-4max6-color-do_674871fb05bf4542b60b2cf17b26081a_large.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football Futsal DSMH11100', 40),
    (41, 15, NOW(), NOW(), 'Red', 'https://product.hstatic.net/1000230642/product/giay-bong-da-nam-hunter-football-futsal-dsmh11100doo-do-4max6-color-do_674871fb05bf4542b60b2cf17b26081a_large.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football Futsal DSMH11100', 41),
    (41, 15, NOW(), NOW(), 'Red', 'https://product.hstatic.net/1000230642/product/giay-bong-da-nam-hunter-football-futsal-dsmh11100doo-do-4max6-color-do_674871fb05bf4542b60b2cf17b26081a_large.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football Futsal DSMH11100', 42),
    (42, 20, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/ay-bong-da-nam-biti-s-hunter-football-dsmh09600cam-cam-v4suh-color-cam_a81bf61d42434afcb93e6d783f746f72.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football DSMH09600', 40),
    (42, 20, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/ay-bong-da-nam-biti-s-hunter-football-dsmh09600cam-cam-v4suh-color-cam_a81bf61d42434afcb93e6d783f746f72.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football DSMH09600', 41),
    (42, 20, NOW(), NOW(), 'Orange', 'https://product.hstatic.net/1000230642/product/ay-bong-da-nam-biti-s-hunter-football-dsmh09600cam-cam-v4suh-color-cam_a81bf61d42434afcb93e6d783f746f72.jpg', 'Giày Bóng Đá Nam Bitis Hunter Football DSMH09600', 42);

-- Thêm thông tin sản phẩm cho category_id = 6 (Giày Tây - MEN)
INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    (43, 10, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm001677nad__5__44339445bba24f36a2b6d0916c20eb5e_large.jpg', 'Giày Mocasin Nam Bitis BMM001677NAD', 40),
    (43, 10, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm001677nad__5__44339445bba24f36a2b6d0916c20eb5e_large.jpg', 'Giày Mocasin Nam Bitis BMM001677NAD', 41),
    (43, 10, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm001677nad__5__44339445bba24f36a2b6d0916c20eb5e_large.jpg', 'Giày Mocasin Nam Bitis BMM001677NAD', 42),
    (44, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001677den__5__aa2201235196437584e120c2a5370dc5_large.jpg', 'Giày Mocasin Nam Bitis BMM001677DEN', 40),
    (44, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001677den__5__aa2201235196437584e120c2a5370dc5_large.jpg', 'Giày Mocasin Nam Bitis BMM001677DEN', 41),
    (44, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001677den__5__aa2201235196437584e120c2a5370dc5_large.jpg', 'Giày Mocasin Nam Bitis BMM001677DEN', 42),
    (45, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bvm002077den__5__4f24438dcb604c0d8ae3aac1be06efb3_large.jpg', 'Giày Tây Nam Bitis BVM002077', 40),
    (45, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bvm002077den__5__4f24438dcb604c0d8ae3aac1be06efb3_large.jpg', 'Giày Tây Nam Bitis BVM002077', 41),
    (45, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bvm002077den__5__4f24438dcb604c0d8ae3aac1be06efb3_large.jpg', 'Giày Tây Nam Bitis BVM002077', 42),
    (46, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001577den__5__ec326fc91f584fbbb0803339886bf205_large.jpg', 'Giày Tây Nam Bitis BMM001577', 40),
    (46, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001577den__5__ec326fc91f584fbbb0803339886bf205_large.jpg', 'Giày Tây Nam Bitis BMM001577', 41),
    (46, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001577den__5__ec326fc91f584fbbb0803339886bf205_large.jpg', 'Giày Tây Nam Bitis BMM001577', 42),
    (47, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001477den__5__621ac7ea60454d62b2b58061a90a0f5a_large.jpg', 'Giày Tây Nam Bitis BMM001477', 40),
    (47, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001477den__5__621ac7ea60454d62b2b58061a90a0f5a_large.jpg', 'Giày Tây Nam Bitis BMM001477', 41),
    (47, 15, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001477den__5__621ac7ea60454d62b2b58061a90a0f5a_large.jpg', 'Giày Tây Nam Bitis BMM001477', 42),
    (48, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001377den__4__fa81fa8523a5481490a1a870be69a2e5_large.jpg', 'Giày Mocasin Nam Bitis BMM0013776', 40),
    (48, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001377den__4__fa81fa8523a5481490a1a870be69a2e5_large.jpg', 'Giày Mocasin Nam Bitis BMM0013776', 41),
    (48, 20, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001377den__4__fa81fa8523a5481490a1a870be69a2e5_large.jpg', 'Giày Mocasin Nam Bitis BMM0013776', 42),
    (49, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001177den__4__6ffc295dc0bb4b1691836b6b4506fb92_large.jpg', 'Giày Mocasin Nam Bitis BMM001177', 40),
    (49, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001177den__4__6ffc295dc0bb4b1691836b6b4506fb92_large.jpg', 'Giày Mocasin Nam Bitis BMM001177', 41),
    (49, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm001177den__4__6ffc295dc0bb4b1691836b6b4506fb92_large.jpg', 'Giày Mocasin Nam Bitis BMM001177', 42),
    (50, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm000877den__5__52bffde8b34f4ce0b318aa4ec6461e50_large.jpg', 'Giày Tây Nam Bitis BMM000877', 40),
    (50, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm000877den__5__52bffde8b34f4ce0b318aa4ec6461e50_large.jpg', 'Giày Tây Nam Bitis BMM000877', 41),
    (50, 10, NOW(), NOW(), 'Black', 'https://product.hstatic.net/1000230642/product/bmm000877den__5__52bffde8b34f4ce0b318aa4ec6461e50_large.jpg', 'Giày Tây Nam Bitis BMM000877', 42),
    (51, 15, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm000777nad5_597ceb5d5a8c4fc8a65567a0cc9f9494_large.jpg', 'Giày Tây Nam Bitis BMM000777', 40),
    (51, 15, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm000777nad5_597ceb5d5a8c4fc8a65567a0cc9f9494_large.jpg', 'Giày Tây Nam Bitis BMM000777', 41),
    (51, 15, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bmm000777nad5_597ceb5d5a8c4fc8a65567a0cc9f9494_large.jpg', 'Giày Tây Nam Bitis BMM000777', 42),
    (52, 20, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bvm001277nad5_b5ed014649e2453884ae5502f9a18d7c_large.jpg', 'Giày Tây Nam Bitis BVM001277', 40),
    (52, 20, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bvm001277nad5_b5ed014649e2453884ae5502f9a18d7c_large.jpg', 'Giày Tây Nam Bitis BVM001277', 41),
    (52, 20, NOW(), NOW(), 'Navy', 'https://product.hstatic.net/1000230642/product/bvm001277nad5_b5ed014649e2453884ae5502f9a18d7c_large.jpg', 'Giày Tây Nam Bitis BVM001277', 42);
    
    -- Thêm thông tin chi tiết cho các sản phẩm thuộc category_id = 7 (Dép - MEN)
INSERT INTO product_info (product_id, quantity, created_at, updated_at, color, image_url, name, size)
VALUES
    -- Dép Lê Nam Đơn Giản
    (53, 10, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/btm001277den__5__aec4a7afae42497589315e06593aedb0_large.jpg', 'Dép Lê Nam Đơn Giản', '39'),
    (53, 15, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/btm001277den__5__aec4a7afae42497589315e06593aedb0_large.jpg', 'Dép Lê Nam Đơn Giản', '40'),
    (53, 20, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/btm001277den__5__aec4a7afae42497589315e06593aedb0_large.jpg', 'Dép Lê Nam Đơn Giản', '41'),

    -- Dép Quai Ngang Nam
    (54, 12, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/btm001277nau__5__c293b277aaf445c0aaad67f152cd87c1_large.jpg', 'Dép Quai Ngang Nam', '38'),
    (54, 18, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/btm001277nau__5__c293b277aaf445c0aaad67f152cd87c1_large.jpg', 'Dép Quai Ngang Nam', '39'),
    (54, 25, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/btm001277nau__5__c293b277aaf445c0aaad67f152cd87c1_large.jpg', 'Dép Quai Ngang Nam', '40'),

    -- Dép Lê Phong Cách Hàn Quốc
    (55, 8, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/bpm001900nau__6__1b5058aba68f4f1d9d5f8be47ddd9cb0_large.jpg', 'Dép Lê Phong Cách Hàn Quốc', '40'),
    (55, 10, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/bpm001900nau__6__1b5058aba68f4f1d9d5f8be47ddd9cb0_large.jpg', 'Dép Lê Phong Cách Hàn Quốc', '41'),
    (55, 14, NOW(), NOW(), 'Nâu', 'https://product.hstatic.net/1000230642/product/bpm001900nau__6__1b5058aba68f4f1d9d5f8be47ddd9cb0_large.jpg', 'Dép Lê Phong Cách Hàn Quốc', '42'),

    -- Dép Cao Su Thời Trang
    (56, 15, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/bpm001900den__4__04f9f543f5b44e048e7dff9c69a2041b_large.jpg', 'Dép Cao Su Thời Trang', '39'),
    (56, 20, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/bpm001900den__4__04f9f543f5b44e048e7dff9c69a2041b_large.jpg', 'Dép Cao Su Thời Trang', '40'),
    (56, 25, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/bpm001900den__4__04f9f543f5b44e048e7dff9c69a2041b_large.jpg', 'Dép Cao Su Thời Trang', '41'),

    -- Tiếp tục cho các sản phẩm khác...
    (57, 12, NOW(), NOW(), 'Xám', 'https://product.hstatic.net/1000230642/product/ttn_7537_3796af1f3bc84f2aa2cee5bbafb1dc28_large.jpg', 'Dép Lê Chống Trơn Trượt', '39'),
    (58, 8, NOW(), NOW(), 'Kem', 'https://product.hstatic.net/1000230642/product/ttn_7546_bcf7dd929ca145aea08743a3fc043273_large.jpg', 'Dép Lê Nam Cao Cấp', '40'),
    (59, 20, NOW(), NOW(), 'Xám', 'https://product.hstatic.net/1000230642/product/brm001500xam__5__23963b18902a47daa548f7905d91a56c_large.jpg', 'Dép Quai Ngang Thể Thao', '42'),
    (60, 15, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/bpm001500den__5__4af1cd11b07a4a0f9a20404d581d66e2_large.jpg', 'Dép Lê Đi Biển', '39'),
    (61, 18, NOW(), NOW(), 'Đen', 'https://product.hstatic.net/1000230642/product/bpm001200den__10__db8f546d529c4c519242f8fcf63b4ef5_large.jpg', 'Dép Da Nam Sang Trọng', '40'),
    (62, 25, NOW(), NOW(), 'Kem', 'https://product.hstatic.net/1000230642/product/bem001400kem__1__db10c1b0652f401c97846d6b41b01b36_large.jpg', 'Dép Lê Kiểu Dáng Trẻ Trung', '41');


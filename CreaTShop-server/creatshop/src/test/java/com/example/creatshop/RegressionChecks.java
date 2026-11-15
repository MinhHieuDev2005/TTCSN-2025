package com.example.creatshop;

import com.example.creatshop.config.VNPayConfig;
import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.dto.request.OrderItemRequest;
import com.example.creatshop.domain.dto.request.OrderRequest;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.request.ProductRequest;
import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.request.ProductValidation;
import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.entity.CartItem;
import com.example.creatshop.constant.CategoryType;
import com.example.creatshop.repository.CategoryRepository;
import com.example.creatshop.repository.CartItemRepository;
import com.example.creatshop.service.ProductService;
import com.example.creatshop.service.ProductVariantService;
import com.example.creatshop.service.impl.ProductServiceImpl;
import com.example.creatshop.service.impl.ProductVariantServiceImpl;
import com.example.creatshop.controller.ProductController;
import com.example.creatshop.controller.VariantController;
import com.example.creatshop.util.CloudinaryUtils;
import jakarta.validation.Validation;
import org.springframework.context.annotation.Bean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import com.example.creatshop.domain.entity.Address;
import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.domain.entity.Role;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.domain.mapper.PaymentMapper;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.job.PaymentExpirationJob;
import com.example.creatshop.repository.AddressRepository;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.repository.ProductRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import com.example.creatshop.repository.RoleRepository;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.security.jwt.AuthTokenFilter;
import com.example.creatshop.service.OrderDetailService;
import com.example.creatshop.service.PaymentLifecycleService;
import com.example.creatshop.service.PaymentService;
import com.example.creatshop.service.VNPayService;
import com.example.creatshop.service.impl.OrderDetailServiceImpl;
import com.example.creatshop.service.impl.PaymentServiceImpl;
import com.example.creatshop.util.EnumUtils;
import com.example.creatshop.util.JwtUtils;
import com.example.creatshop.util.VNPayUtil;
import com.example.creatshop.util.VndAmount;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

public class RegressionChecks {
    static {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }
    private static final String SECRET = "regression-only-vnpay-secret";
    private final ConfigurableApplicationContext context;
    private final OrderDetailService orders;
    private final PaymentService payments;
    private final VNPayService vnpay;
    private final JdbcTemplate jdbc;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private int passed;

    private RegressionChecks(ConfigurableApplicationContext context) {
        this.context = context;
        orders = context.getBean(OrderDetailService.class);
        payments = context.getBean(PaymentService.class);
        vnpay = context.getBean(VNPayService.class);
        jdbc = context.getBean(JdbcTemplate.class);
    }

    public static void main(String[] args) throws Exception {
        String[] databaseOptions = databaseOptions(args);
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(CheckConfig.class)
                .web(WebApplicationType.NONE).run(
                        "--spring.config.location=optional:classpath:/regression-only.properties",
                        databaseOptions[0], databaseOptions[1], databaseOptions[2], databaseOptions[3],
                        "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.jpa.open-in-view=false",
                        "--spring.main.banner-mode=off", "--logging.level.root=WARN", "--debug=false",
                        "--logging.level.org.hibernate.SQL=OFF", "--logging.level.org.springframework.jdbc=OFF",
                        "--logging.level.org.hibernate.tool.schema.internal.ExceptionHandlerLoggedImpl=ERROR",
                        "--vnp.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                        "--vnp.return-url=http://localhost/payment-return",
                        "--vnp.tmn-code=REGRESSION", "--vnp.hash-secret=" + SECRET,
                        "--auth.token.jwtSecret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
                        "--auth.token.expirationInMils=3600000", "--auth.token.refreshInMils=7200000")) {
            RegressionChecks checks = new RegressionChecks(context);
            try {
                if (args.length > 0) {
                    String isolation = checks.jdbc.queryForObject("select @@transaction_isolation", String.class);
                    require("REPEATABLE-READ".equals(isolation), "MySQL isolation must be REPEATABLE-READ");
                    System.out.println("MySQL " + checks.jdbc.queryForObject("select version()", String.class)
                            + ": isolated database, " + isolation);
                }
                checks.run("payment transitions and ownership", checks::paymentTransitions);
                checks.run("default and unsupported locales return validation errors instead of HTTP 500", checks::localizedErrors);
                checks.run("profile editing preserves credentials; password change requires reauthentication and revokes JWTs", checks::customerPasswordUpdate);
                checks.run("address removal archives historical records and blocks reuse", checks::addressRemoval);
                checks.run("stale account and address writes cannot restore credentials or archived ownership", checks::staleCustomerWrites);
                checks.run("concurrent cart adds merge quantities and preserve edited checkout rows", checks::customerCartSafety);
                checks.run("two orders competing for the last item", checks::lastStockRace);
                checks.run("one payment cannot create two orders", checks::duplicateOrderRace);
                checks.run("insufficient stock rolls back the entire order", checks::stockRollback);
                checks.run("stock release and purchase do not overwrite each other", checks::releasePurchaseRace);
                checks.run("concurrent cancellations restore stock once", checks::cancelRace);
                checks.run("IPN and return failure restore stock once", checks::callbackRace);
                checks.run("cancel versus successful IPN", checks::cancelSuccessRace);
                checks.run("expiry versus successful IPN", checks::expirySuccessRace);
                checks.run("expiry rules, grace period and COD exclusion", checks::expiryRules);
                checks.run("late payment requires refund without reusing stock", checks::lateSuccess);
                checks.run("checksum, merchant and amount validation", checks::callbackValidation);
                checks.run("exact VND arithmetic, limits and stock rollback", checks::exactMoney);
                checks.run("payment link deadline cannot be extended", checks::linkDeadline);
                checks.run("fulfillment guards and COD confirmation", checks::fulfillment);
                checks.run("canceled orders are terminal with actor, reason and timestamp", checks::cancellationMetadata);
                checks.run("banned account cannot use previously issued JWT", checks::bannedJwt);
                checks.run("dashboard date boundaries, payment exclusions and current queues", checks::dashboardStatistics);
                checks.run("category edits and deletion preserve products, stock and orders", checks::categorySafety);
                checks.run("self-ban and concurrent admin locks preserve an active administrator", checks::adminAccountSafety);
                checks.run("product create/update validation and optional update images", checks::productValidation);
                checks.run("product category updates and zero stock", checks::productUpdates);
                checks.run("purchase snapshots survive catalog edits and legacy rows remain unknown", checks::orderSnapshots);
                checks.run("recipient snapshots survive address edits and preserve unknown legacy history", checks::recipientSnapshots);
                checks.run("duplicate variants rejected on create, update and concurrent creation", checks::duplicateVariants);
                checks.run("stale admin stock and concurrent checkout", checks::adminStockRace);
                checks.run("safe variant deletion preserves orders, carts and parent products", checks::productDeletion);
                System.out.println("PASS: " + checks.passed + " regression checks; all concurrency assertions passed.");
            } finally {
                checks.executor.shutdownNow();
                SecurityContextHolder.clearContext();
            }
        }
    }

    private static String[] databaseOptions(String[] args) {
        if (args.length == 0) {
            return new String[]{
                    "--spring.datasource.url=jdbc:h2:mem:regression;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
                    "--spring.datasource.driver-class-name=org.h2.Driver",
                    "--spring.datasource.username=sa", "--spring.datasource.password="};
        }
        require(args.length == 1 && "mysql".equals(args[0]), "Only the isolated mysql mode is supported");
        String database = System.getenv("CREATSHOP_TEST_DB_NAME");
        String port = System.getenv("CREATSHOP_TEST_DB_PORT");
        String password = System.getenv("CREATSHOP_TEST_DB_PASSWORD");
        require(database != null && database.matches("creatshop_regression_[0-9a-f]{32}"), "Unsafe test database name");
        require(port != null && port.matches("[0-9]{4,5}"), "Invalid test port");
        int portNumber = Integer.parseInt(port);
        require(portNumber >= 1024 && portNumber <= 65535 && portNumber != 3306 && portNumber != 3307,
                "Refusing to run destructive checks on an application MySQL port");
        require(password != null && !password.isBlank(), "A scoped test password is required");
        return new String[]{
                "--spring.datasource.url=jdbc:mysql://127.0.0.1:" + port + "/" + database
                        + "?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh",
                "--spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
                "--spring.datasource.username=creatshop_checks", "--spring.datasource.password=" + password};
    }

    private void localizedErrors() throws Exception {
        var messages = (org.springframework.context.support.ResourceBundleMessageSource)
                new com.example.creatshop.config.MessageSourceConfig().messageSource();
        messages.setFallbackToSystemLocale(false);
        var english = new java.util.Properties();
        try (var reader = new java.io.InputStreamReader(
                getClass().getResourceAsStream("/i18n/messages_en.properties"), StandardCharsets.UTF_8)) {
            english.load(reader);
        }
        var keys = new java.util.HashSet<>(english.stringPropertyNames());
        for (var group : com.example.creatshop.constant.ErrorMessage.class.getDeclaredClasses()) {
            for (var field : group.getFields()) {
                if (field.getType() == String.class) keys.add((String) field.get(null));
            }
        }
        var handler = new com.example.creatshop.exception.GlobalExceptionHandler(messages,
                new com.example.creatshop.util.MessageSourceUtils(messages));
        var previous = org.springframework.context.i18n.LocaleContextHolder.getLocale();
        try {
            for (var locale : List.of(java.util.Locale.ROOT, java.util.Locale.ENGLISH,
                    java.util.Locale.forLanguageTag("vi-VN"), java.util.Locale.FRENCH)) {
                for (String key : keys) {
                    require(!messages.getMessage(key, new Object[]{"test", "test"}, locale).isBlank(),
                            "Missing default message: " + key);
                }
                org.springframework.context.i18n.LocaleContextHolder.setLocale(locale);
                var response = handler.handlerBadRequestException(new BadRequestException(
                        com.example.creatshop.constant.ErrorMessage.Payment.ERR_ONLY_PENDING_CAN_CANCEL));
                require(response.getStatusCode().value() == 400 && response.getBody().getMeta().getMessage() != null,
                        "Rejected payment must return a readable HTTP 400 for " + locale);
            }
        } finally {
            org.springframework.context.i18n.LocaleContextHolder.setLocale(previous);
        }
    }

    private void customerPasswordUpdate() throws Exception {
        Fixture fixture = fixture("COD", 1, false);
        var service = context.getBean(com.example.creatshop.service.UserService.class);
        var users = context.getBean(UserRepository.class);
        var encoder = context.getBean(org.springframework.security.crypto.password.PasswordEncoder.class);
        String oldHash = encoder.encode("Before9!Pass");
        jdbc.update("update users set password = ? where username = ?", oldHash, fixture.username());
        var jwt = context.getBean(JwtUtils.class);
        var filter = new AuthTokenFilter(jwt, username -> users.findByUsername(username).orElseThrow());
        var principal = users.findByUsername(fixture.username()).orElseThrow();
        String token = jwt.generateJwtToken(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        var request = com.example.creatshop.domain.dto.request.UserUpdateRequest.builder()
                .firstName("Updated").lastName("Customer").email("updated@example.test")
                .phoneNumber("0901234567").build();
        expectRejected(() -> service.updateUser(request, fixture.username()));
        require(principal.getEmail().equals(users.findByUsername(fixture.username()).orElseThrow().getEmail()), "Unverified email change was accepted");
        request.setEmail(null);
        service.updateUser(request, fixture.username());
        var user = users.findByUsername(fixture.username()).orElseThrow();
        require(oldHash.equals(user.getPassword()) && authenticated(filter, token), "Profile edit changed credentials or revoked a valid session");
        require("Updated".equals(user.getFirstName()), "Profile update was lost");
        var change = new com.example.creatshop.domain.dto.request.PasswordChangeRequest();
        change.setNewPassword("Changed9!Pass");
        change.setCurrentPassword("Wrong9!Pass");
        expectRejected(() -> service.changePassword(change, fixture.username()));
        require(oldHash.equals(users.findByUsername(fixture.username()).orElseThrow().getPassword()), "Rejected password change changed the hash");
        change.setCurrentPassword("Before9!Pass");
        service.changePassword(change, fixture.username());
        user = users.findByUsername(fixture.username()).orElseThrow();
        require(encoder.matches(change.getNewPassword(), user.getPassword()), "New password cannot authenticate");
        require(!authenticated(filter, token), "Old JWT remains usable after password change");
        String fresh = jwt.generateJwtToken(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        require(authenticated(filter, fresh), "Newly issued JWT rejected");
        String legacy = io.jsonwebtoken.Jwts.builder().setSubject(user.getUsername())
                .setExpiration(new java.util.Date(System.currentTimeMillis() + 60000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(io.jsonwebtoken.io.Decoders.BASE64.decode(
                        context.getEnvironment().getProperty("auth.token.jwtSecret")))).compact();
        require(!authenticated(filter, legacy), "JWT without credential stamp accepted");
    }

    private void staleCustomerWrites() {
        Fixture fixture = fixture("COD", 1, false);
        var users = context.getBean(UserRepository.class);
        var encoder = context.getBean(org.springframework.security.crypto.password.PasswordEncoder.class);
        jdbc.update("update users set password = ? where username = ?", encoder.encode("Before9!Pass"), fixture.username());
        var change = new com.example.creatshop.domain.dto.request.PasswordChangeRequest();
        change.setCurrentPassword("Before9!Pass");
        change.setNewPassword("Changed9!Pass");
        var transaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        transaction.executeWithoutResult(status -> {
            User stale = users.findByUsername(fixture.username()).orElseThrow();
            try {
                executor.submit(() -> context.getBean(com.example.creatshop.service.UserService.class)
                        .changePassword(change, fixture.username())).get(15, TimeUnit.SECONDS);
            } catch (Exception exception) {
                throw new AssertionError("Concurrent password update failed", exception);
            }
            stale.setStatus(AccountStatus.BANNED);
        });
        require(encoder.matches(change.getNewPassword(), users.findByUsername(fixture.username()).orElseThrow().getPassword()),
                "Stale account status change restored the previous password hash");
        transaction.executeWithoutResult(status -> {
            Address stale = context.getBean(AddressRepository.class).findById(fixture.addressId()).orElseThrow();
            try {
                executor.submit(() -> context.getBean(com.example.creatshop.service.AddressService.class)
                        .deleteAddress(fixture.username(), fixture.addressId())).get(15, TimeUnit.SECONDS);
            } catch (Exception exception) {
                throw new AssertionError("Concurrent address archive failed", exception);
            }
            stale.setDescription("Concurrent edit");
        });
        require(context.getBean(AddressRepository.class).findById(fixture.addressId()).orElseThrow().getUser() == null,
                "Stale address edit restored archived ownership");
    }

    private void addressRemoval() {
        Fixture fixture = fixture("COD", 2, false);
        var created = orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 1)))).getData();
        var addresses = context.getBean(com.example.creatshop.service.AddressService.class);
        Fixture outsider = fixture("COD", 1, false);
        expectRejected(() -> addresses.deleteAddress(outsider.username(), fixture.addressId()));
        addresses.deleteAddress(fixture.username(), fixture.addressId());
        require(addresses.getAddress(fixture.username()).getData().isEmpty(), "Archived address remains in address book");
        require(context.getBean(com.example.creatshop.service.UserService.class).getUser(fixture.username()).getData().getAddress().isEmpty(),
                "Archived address remains in profile");
        require(context.getBean(AddressRepository.class).findById(fixture.addressId()).orElseThrow().getUser() == null,
                "Address was deleted or remains available for checkout");
        expectRejected(() -> addresses.getAddressById(fixture.username(), fixture.addressId()));
        expectRejected(() -> addresses.deleteAddress(fixture.username(), fixture.addressId()));
        expectRejected(() -> addresses.updateAddress(fixture.username(), fixture.addressId(),
                com.example.creatshop.domain.dto.request.AddressRequest.builder().build()));
        expectRejected(() -> orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 1)))));
        require("Address".equals(orders.getOrder(fixture.username(), created.getId()).getData().getAddress().getAddressDetail()),
                "Address removal changed recipient snapshot");
        jdbc.update("update order_details set recipient_first_name = NULL where id = ?", created.getId());
        require("Address".equals(orders.getOrder(fixture.username(), created.getId()).getData().getAddress().getAddressDetail()),
                "Address removal broke legacy recipient fallback");
    }

    private void customerCartSafety() throws Exception {
        Fixture fixture = fixture("COD", 10, false);
        Fixture outsider = fixture("COD", 10, false);
        for (Fixture owner : List.of(fixture, outsider)) {
            new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
                User user = context.getBean(UserRepository.class).findByUsername(owner.username()).orElseThrow();
                user.setCart(context.getBean(com.example.creatshop.repository.CartRepository.class)
                        .save(com.example.creatshop.domain.entity.Cart.builder().build()));
            });
        }
        var service = context.getBean(com.example.creatshop.service.CartItemService.class);
        var request = new com.example.creatshop.domain.dto.request.CartItemRequest(fixture.productId(), fixture.variantId(), 1);
        List<Boolean> results = race(() -> attempt(() -> service.addCartItem(fixture.username(), request)),
                () -> attempt(() -> service.addCartItem(fixture.username(), request)));
        require(results.stream().allMatch(Boolean::booleanValue), "Concurrent cart add failed");
        var items = service.getCartItem(fixture.username()).getData();
        require(items.size() == 1 && items.get(0).getQuantity() == 2, "Concurrent cart additions were duplicated or lost");
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            User user = context.getBean(UserRepository.class).findByUsername(fixture.username()).orElseThrow();
            context.getBean(com.example.creatshop.repository.CartItemRepository.class).save(CartItem.builder()
                    .cart(user.getCart()).product(context.getBean(ProductRepository.class).findById(fixture.productId()).orElseThrow())
                    .productVariant(context.getBean(ProductVariantRepository.class).findById(fixture.variantId()).orElseThrow())
                    .quantity(3).build());
        });
        request.setQuantity(2);
        Integer id = service.addCartItem(fixture.username(), request).getData().getId();
        items = service.getCartItem(fixture.username()).getData();
        require(items.size() == 1 && items.get(0).getQuantity() == 7, "Legacy duplicate cart rows were not merged");
        request.setQuantity(Integer.MAX_VALUE);
        expectRejected(() -> service.addCartItem(fixture.username(), request));
        request.setQuantity(0);
        expectRejected(() -> service.updateCartItem(fixture.username(), id, request));
        expectRejected(() -> service.deleteCartItem(outsider.username(), id));
        request.setQuantity(4);
        expectRejected(() -> service.updateCartItem(outsider.username(), id, request));
        service.deleteCartItem(fixture.username(), id, 2);
        require(service.getCartItem(fixture.username()).getData().get(0).getQuantity() == 7,
                "Checkout cleanup deleted a cart row changed after checkout");
        expectRejected(() -> service.deleteCartItem(fixture.username(), id, 0));
        service.deleteCartItem(fixture.username(), id, 7);
        require(service.getCartItem(fixture.username()).getData().isEmpty(), "Unchanged purchased row was not removed");
    }

    private void paymentTransitions() {
        Fixture fixture = fixture("COD", 2, false);
        expectRejected(() -> payments.updatePayment("another-user", fixture.paymentId(), payment("COD", "CANCELED")));
        expectRejected(() -> payments.updatePayment(fixture.username(), fixture.paymentId(), payment("COD", "COMPLETED")));
        payments.updatePayment(fixture.username(), fixture.paymentId(), payment("COD", "CANCELED"));
        payments.updatePayment(fixture.username(), fixture.paymentId(), payment("COD", "CANCELED"));
        require(status(fixture) == PaymentStatus.CANCELED, "Retrying unused-payment cancellation changed its result");
        expectRejected(() -> payments.updatePayment(fixture.username(), fixture.paymentId(), payment("COD", "PENDING")));
        expectRejected(() -> payments.updatePayment(fixture.username(), fixture.paymentId(), payment("COD", "FAILED")));
        Fixture ordered = fixture("COD", 2, true);
        expectRejected(() -> payments.updatePayment(ordered.username(), ordered.paymentId(), payment("COD", "CANCELED")));
        orders.cancelOrder(ordered.username(), ordered.paymentId());
        expectRejected(() -> payments.updatePayment(ordered.username(), ordered.paymentId(), payment("COD", "PENDING")));
        expectRejected(() -> orders.cancelOrder(ordered.username(), ordered.paymentId()));
        require(stock(ordered) == 2, "Repeated cancellation changed stock");
        Fixture paid = fixture("VNPAY", 1, true);
        vnpay.handleIpn(callback(paid, true));
        expectRejected(() -> payments.updatePayment(paid.username(), paid.paymentId(), payment("VNPAY", "PENDING")));
        expectRejected(() -> orders.cancelOrder(paid.username(), paid.paymentId()));
    }

    private void lastStockRace() throws Exception {
        Fixture fixture = fixture("COD", 1, false);
        Integer secondPayment = payments.createPayment(fixture.username(), payment("COD", "PENDING")).getData().getId();
        List<Boolean> results = race(() -> attempt(() -> createOrder(fixture, fixture.paymentId())),
                () -> attempt(() -> createOrder(fixture, secondPayment)));
        require(results.stream().filter(Boolean::booleanValue).count() == 1, "Last item sold more than once");
        require(stock(fixture) == 0, "Incorrect stock after competing orders");
    }

    private void duplicateOrderRace() throws Exception {
        for (int iteration = 0; iteration < 5; iteration++) {
            Fixture fixture = fixture("COD", 2, false);
            List<Boolean> results = race(() -> attempt(() -> createOrder(fixture, fixture.paymentId())),
                    () -> attempt(() -> createOrder(fixture, fixture.paymentId())));
            require(results.stream().filter(Boolean::booleanValue).count() == 1,
                    "Payment linked to multiple orders: " + results);
            require(stock(fixture) == 1, "Duplicate order deducted stock");
        }
    }

    private void cancelRace() throws Exception {
        Fixture fixture = fixture("COD", 1, true);
        race(() -> attempt(() -> orders.cancelOrder(fixture.username(), fixture.paymentId())),
                () -> attempt(() -> orders.cancelOrder(fixture.username(), fixture.paymentId())));
        require(status(fixture) == PaymentStatus.CANCELED && stock(fixture) == 1, "Stock restored twice");
    }

    private void stockRollback() {
        Fixture fixture = fixture("COD", 1, false);
        expectRejected(() -> orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 1),
                        new OrderItemRequest(fixture.productId(), fixture.variantId(), 1)))));
        require(stock(fixture) == 1 && orderId(fixture) == null, "Partial order was not rolled back");
        expectRejected(() -> orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), -1)))));
        require(stock(fixture) == 1, "Negative quantity increased stock");
    }

    private void releasePurchaseRace() throws Exception {
        for (int iteration = 0; iteration < 5; iteration++) {
            Fixture fixture = fixture("COD", 2, true);
            Integer secondPayment = payments.createPayment(fixture.username(), payment("COD", "PENDING")).getData().getId();
            List<Boolean> results = race(() -> attempt(() -> orders.cancelOrder(fixture.username(), fixture.paymentId())),
                    () -> attempt(() -> createOrder(fixture, secondPayment)));
            require(results.stream().allMatch(Boolean::booleanValue), "Release or purchase failed");
            require(stock(fixture) == 1, "Concurrent release and purchase lost an inventory update");
        }
    }

    private void callbackRace() throws Exception {
        Fixture fixture = fixture("VNPAY", 1, true);
        race(() -> { vnpay.handleIpn(callback(fixture, false)); return true; },
                () -> { vnpay.handleReturn(callback(fixture, false)); return true; });
        require(status(fixture) == PaymentStatus.CANCELED && stock(fixture) == 1, "Callbacks restored stock twice");
        vnpay.handleIpn(callback(fixture, false));
        require(stock(fixture) == 1, "Repeated IPN restored stock");
    }

    private void cancelSuccessRace() throws Exception {
        for (int iteration = 0; iteration < 5; iteration++) {
            Fixture fixture = fixture("VNPAY", 1, true);
            race(() -> attempt(() -> orders.cancelOrder(fixture.username(), fixture.paymentId())),
                    () -> { vnpay.handleIpn(callback(fixture, true)); return true; });
            requireConsistentSuccessfulPayment(fixture);
        }
    }

    private void expirySuccessRace() throws Exception {
        for (int iteration = 0; iteration < 5; iteration++) {
            Fixture fixture = fixture("VNPAY", 1, true);
            age(fixture, 21);
            race(() -> { context.getBean(PaymentLifecycleService.class).expirePayment(fixture.paymentId()); return true; },
                    () -> { vnpay.handleIpn(callback(fixture, true)); return true; });
            requireConsistentSuccessfulPayment(fixture);
        }
    }

    private void expiryRules() {
        Fixture expired = fixture("VNPAY", 1, true);
        Fixture grace = fixture("VNPAY", 1, true);
        Fixture fresh = fixture("VNPAY", 1, true);
        Fixture cod = fixture("COD", 1, true);
        Fixture paid = fixture("VNPAY", 1, true);
        Fixture orphan = fixture("VNPAY", 1, false);
        vnpay.handleIpn(callback(paid, true));
        for (Fixture fixture : List.of(expired, cod, paid, orphan)) age(fixture, 21);
        age(grace, 16);
        context.getBean(PaymentExpirationJob.class).expirePayments();
        context.getBean(PaymentExpirationJob.class).expirePayments();
        require(status(expired) == PaymentStatus.CANCELED && stock(expired) == 1, "Expired order not released exactly once");
        require(status(orphan) == PaymentStatus.CANCELED && stock(orphan) == 1, "Orphan payment expiry changed stock");
        for (Fixture fixture : List.of(grace, fresh, cod)) {
            require(status(fixture) == PaymentStatus.PENDING && stock(fixture) == 0, "Unexpired/COD stock released");
        }
        require(status(paid) == PaymentStatus.COMPLETED && stock(paid) == 0, "Paid order was expired");
    }

    private void lateSuccess() {
        Fixture fixture = fixture("VNPAY", 1, true);
        orders.cancelOrder(fixture.username(), fixture.paymentId());
        require("00".equals(vnpay.handleIpn(callback(fixture, true)).get("RspCode")), "Late payment not acknowledged");
        require(status(fixture) == PaymentStatus.REFUND_REQUIRED && stock(fixture) == 1, "Late success reused released stock");
        require(vnpay.handleReturn(callback(fixture, true)) == PaymentStatus.REFUND_REQUIRED, "Canceled order presented as successful");
        vnpay.handleIpn(callback(fixture, true));
        vnpay.handleIpn(callback(fixture, false));
        require(status(fixture) == PaymentStatus.REFUND_REQUIRED && stock(fixture) == 1, "Repeated late callback changed stock");
        expectRejected(() -> orders.moveToNextStatus(orderId(fixture)));
    }

    private void callbackValidation() {
        Fixture fixture = fixture("VNPAY", 1, true);
        MockHttpServletRequest tampered = callback(fixture, true);
        tampered.setParameter("vnp_Amount", "20000");
        require("97".equals(vnpay.handleIpn(tampered).get("RspCode")), "Invalid signature accepted");
        for (String amount : List.of("20000", "NaN", "Infinity", "-10000", "not-a-number")) {
            Map<String, String> fields = fields(fixture, true);
            fields.put("vnp_Amount", amount);
            require("04".equals(vnpay.handleIpn(signed(fields)).get("RspCode")), "Invalid amount accepted: " + amount);
        }
        Map<String, String> wrongMerchant = fields(fixture, true);
        wrongMerchant.put("vnp_TmnCode", "OTHER");
        require("97".equals(vnpay.handleIpn(signed(wrongMerchant)).get("RspCode")), "Wrong merchant accepted");
        Map<String, String> missingResult = fields(fixture, true);
        missingResult.remove("vnp_ResponseCode");
        missingResult.remove("vnp_TransactionStatus");
        require("97".equals(vnpay.handleIpn(signed(missingResult)).get("RspCode")), "Unsigned result treated as failure");
        require(status(fixture) == PaymentStatus.PENDING && stock(fixture) == 0, "Invalid callback mutated payment");
        require(vnpay.handleReturn(callback(fixture, true)) == PaymentStatus.COMPLETED, "Valid signed return rejected");
        require("02".equals(vnpay.handleIpn(callback(fixture, true)).get("RspCode")), "Successful callback not idempotent");
    }

    private void exactMoney() {
        require(VndAmount.requireValid(new BigDecimal("100.00")).equals(BigDecimal.valueOf(100)), "Whole VND with trailing zeros rejected");
        expectRejected(() -> VndAmount.requireValid(null));
        for (String invalid : List.of("0", "-1", "0.1", "100.5", "1000000000000000")) {
            expectRejected(() -> VndAmount.requireValid(new BigDecimal(invalid)));
        }
        Fixture fixture = fixture("VNPAY", 3, false);
        BigDecimal price = new BigDecimal("123456789012345");
        BigDecimal total = price.multiply(BigDecimal.valueOf(3));
        jdbc.update("update products set price = ? where id = ?", price, fixture.productId());
        var order = orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 3)))).getData();
        require(order.getTotal().compareTo(total) == 0 && order.getPayment().getAmount().compareTo(total) == 0,
                "Order/payment amount lost precision");
        require(order.getOrderItems().get(0).getUnitPrice().compareTo(price) == 0, "Snapshot price lost precision");
        String link = vnpay.createVnPayPayment(fixture.username(), total.longValueExact(), null, fixture.paymentId(), new MockHttpServletRequest()).paymentUrl;
        String amount = total.movePointRight(2).toPlainString();
        require(amount.equals(query(link).get("vnp_Amount")), "VNPay amount lost precision");
        var fields = fields(fixture, true);
        fields.put("vnp_Amount", total.movePointRight(2).add(BigDecimal.ONE).toPlainString());
        require("04".equals(vnpay.handleIpn(signed(fields)).get("RspCode")), "One-unit callback mismatch accepted");
        fields.put("vnp_Amount", amount);
        require("00".equals(vnpay.handleIpn(signed(fields)).get("RspCode")), "Exact high-value callback rejected");
        require(status(fixture) == PaymentStatus.COMPLETED && stock(fixture) == 0, "Exact payment changed stock");
        for (String invalidPrice : List.of("999999999999999", "100.5")) {
            Fixture invalid = fixture("COD", 2, false);
            jdbc.update("update products set price = ? where id = ?", new BigDecimal(invalidPrice), invalid.productId());
            expectRejected(() -> orders.createOrder(invalid.username(), new OrderRequest(invalid.paymentId(), invalid.addressId(),
                    List.of(new OrderItemRequest(invalid.productId(), invalid.variantId(), 2)))));
            require(stock(invalid) == 2 && orderId(invalid) == null, "Rejected amount leaked stock or an order");
            expectRejected(() -> payments.createPayment(invalid.username(),
                    new PaymentRequest(new BigDecimal("1.5"), "COD", "PENDING")));
        }
    }

    private void linkDeadline() {
        Fixture fixture = fixture("VNPAY", 1, true);
        String first = vnpay.createVnPayPayment(fixture.username(), 100, null, fixture.paymentId(), new MockHttpServletRequest()).paymentUrl;
        String second = vnpay.createVnPayPayment(fixture.username(), 100, null, fixture.paymentId(), new MockHttpServletRequest()).paymentUrl;
        require(query(first).get("vnp_ExpireDate").equals(query(second).get("vnp_ExpireDate")), "Link regeneration extended deadline");
        age(fixture, 16);
        expectRejected(() -> vnpay.createVnPayPayment(fixture.username(), 100, null, fixture.paymentId(), new MockHttpServletRequest()));
        Fixture orphan = fixture("VNPAY", 1, false);
        age(orphan, 16);
        expectRejected(() -> createOrder(orphan, orphan.paymentId()));
        require(stock(orphan) == 1, "Expired payment reserved stock");
    }

    private void fulfillment() {
        Fixture unpaid = fixture("VNPAY", 1, true);
        expectRejected(() -> orders.moveToNextStatus(orderId(unpaid)));
        orders.cancelOrder(unpaid.username(), unpaid.paymentId());
        expectRejected(() -> orders.moveToNextStatus(orderId(unpaid)));
        Fixture cod = fixture("COD", 1, true);
        expectRejected(() -> payments.confirmCodPayment(cod.paymentId()));
        orders.moveToNextStatus(orderId(cod));
        expectRejected(() -> orders.moveToPreviousStatus(orderId(cod)));
        orders.moveToNextStatus(orderId(cod));
        expectRejected(() -> orders.moveToPreviousStatus(orderId(cod)));
        payments.confirmCodPayment(cod.paymentId());
        require(status(cod) == PaymentStatus.COMPLETED, "Delivered COD could not be confirmed");
        expectRejected(() -> payments.confirmCodPayment(cod.paymentId()));
    }

    private void cancellationMetadata() {
        Fixture customer = fixture("COD", 2, true);
        orders.cancelOrder(customer.username(), customer.paymentId());
        var canceled = orders.getOrder(customer.username(), orderId(customer)).getData();
        require("Canceled".equals(canceled.getStatus()), "Canceled order remains active");
        require("CUSTOMER_REQUEST".equals(canceled.getCancellationReason()), "Customer cancellation reason missing");
        require(customer.username().equals(canceled.getCanceledBy()) && canceled.getCanceledAt() != null,
                "Cancellation actor/time missing");
        expectRejected(() -> orders.cancelOrder(customer.username(), customer.paymentId()));
        expectRejected(() -> orders.moveToNextStatus(orderId(customer)));
        expectRejected(() -> orders.moveToPreviousStatus(orderId(customer)));
        require(stock(customer) == 2, "Canceled order restored stock more than once");
        Fixture admin = fixture("COD", 1, false);
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            Role role = context.getBean(RoleRepository.class).findByType(RoleType.ROLE_ADMIN)
                    .orElseGet(() -> context.getBean(RoleRepository.class).save(Role.builder().type(RoleType.ROLE_ADMIN).build()));
            User user = context.getBean(UserRepository.class).findByUsername(admin.username()).orElseThrow();
            user.setRole(role);
        });
        Fixture adminCanceled = fixture("COD", 1, true);
        orders.cancelOrder(admin.username(), adminCanceled.paymentId());
        var adminResponse = orders.getOrder(adminCanceled.username(), orderId(adminCanceled)).getData();
        require("ADMIN_REQUEST".equals(adminResponse.getCancellationReason()) && admin.username().equals(adminResponse.getCanceledBy()),
                "Admin cancellation attribution missing");
        Fixture expired = fixture("VNPAY", 1, true);
        age(expired, 21);
        context.getBean(PaymentLifecycleService.class).expirePayment(expired.paymentId());
        var expiry = orders.getOrder(expired.username(), orderId(expired)).getData();
        require("Canceled".equals(expiry.getStatus()) && "PAYMENT_EXPIRED".equals(expiry.getCancellationReason()), "Expiry not terminal");
        Fixture failed = fixture("VNPAY", 1, true);
        vnpay.handleIpn(callback(failed, false));
        var failure = orders.getOrder(failed.username(), orderId(failed)).getData();
        require("Canceled".equals(failure.getStatus()) && "PAYMENT_FAILED".equals(failure.getCancellationReason()), "Failure not terminal");
        vnpay.handleIpn(callback(failed, true));
        require("Canceled".equals(orders.getOrder(failed.username(), orderId(failed)).getData().getStatus())
                && status(failed) == PaymentStatus.REFUND_REQUIRED && stock(failed) == 1, "Late success reopened a canceled order");
    }

    private void dashboardStatistics() {
        var dashboard = context.getBean(com.example.creatshop.service.DashboardService.class);
        var start = java.time.LocalDate.of(2001, 1, 1);
        var end = start.plusDays(1);
        var empty = dashboard.getDashboard(start, end);
        require(empty.ordersCreated() == 0 && empty.paidOrderValue().signum() == 0 && empty.days().size() == 2, "Empty dashboard is not zero-filled");
        require(empty.catalog().totalStockUnits() == jdbc.queryForObject("select coalesce(sum(quantity), 0) from product_info", Long.class),
                "Total stock does not match variant quantities");
        Fixture first = fixture("COD", 2, true);
        Fixture second = fixture("COD", 2, true);
        Fixture canceled = fixture("COD", 2, true);
        Fixture cod = fixture("COD", 2, true);
        Fixture refund = fixture("VNPAY", 2, true);
        Fixture outside = fixture("COD", 2, true);
        List<Fixture> fixtures = List.of(first, second, canceled, cod, refund, outside);
        List<String> dates = List.of("2001-01-01 00:00:00", "2001-01-02 23:59:59.999999", "2001-01-01 12:00:00",
                "2001-01-01 13:00:00", "2001-01-02 14:00:00", "2001-01-03 00:00:00");
        for (int index = 0; index < fixtures.size(); index++) {
            jdbc.update("update order_details set total = ?, created_at = ? where id = ?", (index + 1) * 100.0,
                    java.sql.Timestamp.valueOf(dates.get(index)), orderId(fixtures.get(index)));
        }
        for (Fixture fixture : List.of(first, second, canceled, outside)) {
            jdbc.update("update payment_details set status = 'COMPLETED' where id = ?", fixture.paymentId());
        }
        jdbc.update("update order_details set status = 'Canceled' where id = ?", orderId(canceled));
        jdbc.update("update order_details set status = 'Delivered' where id = ?", orderId(cod));
        jdbc.update("update order_details set status = 'Canceled' where id = ?", orderId(refund));
        jdbc.update("update payment_details set status = 'REFUND_REQUIRED' where id = ?", refund.paymentId());
        var result = dashboard.getDashboard(start, end);
        require(result.ordersCreated() == 5 && result.paidOrders() == 2, "Date boundaries or payment exclusions wrong");
        require(result.paidOrderValue().compareTo(java.math.BigDecimal.valueOf(300)) == 0
                && result.averagePaidOrderValue().compareTo(java.math.BigDecimal.valueOf(150)) == 0, "Paid value or average includes canceled/COD/refund orders");
        require(result.days().get(0).ordersCreated() == 3 && result.days().get(1).ordersCreated() == 2
                && result.days().stream().map(com.example.creatshop.domain.dto.response.DashboardResponse.Day::paidOrderValue)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add).compareTo(result.paidOrderValue()) == 0,
                "Daily series does not reconcile with cards");
        require(result.backlog().codUncollected() == empty.backlog().codUncollected() + 1
                && result.backlog().refundRequired() == empty.backlog().refundRequired() + 1
                && result.backlog().readyToShip() == empty.backlog().readyToShip() + 3, "Current queues incorrectly date-filtered");
        require(result.catalog().customers() == empty.catalog().customers() + 6
                && result.catalog().lowStockVariants() == empty.catalog().lowStockVariants() + 6, "Customer or stock counts wrong");
        var noOrders = dashboard.getDashboard(start.minusDays(10), start.minusDays(9));
        require(noOrders.ordersCreated() == 0 && noOrders.backlog().equals(result.backlog()), "Current queues depend on date range");
        require(noOrders.catalog().equals(result.catalog()), "Inventory depends on date range");
        require(result.catalog().totalStockUnits() == empty.catalog().totalStockUnits() + 6,
                "Total stock must use remaining quantities, not variant count");
        fixture("COD", 0, false);
        fixture("COD", 5, false);
        fixture("COD", 6, false);
        Fixture withoutVariant = fixture("COD", 0, false);
        context.getBean(ProductVariantService.class).deleteVariant(withoutVariant.variantId());
        var stock = dashboard.getDashboard(start, end).catalog();
        require(stock.outOfStockVariants() == result.catalog().outOfStockVariants() + 1
                && stock.lowStockVariants() == result.catalog().lowStockVariants() + 1,
                "Stock warning boundaries must distinguish zero, 1-5 and above 5");
        require(stock.totalStockUnits() == result.catalog().totalStockUnits() + 11,
                "Total stock includes incorrect quantities");
        require(stock.productsWithoutVariants() == result.catalog().productsWithoutVariants() + 1
                && stock.products() == result.catalog().products() + 4,
                "Products without variants must be counted separately from out-of-stock variants");
        expectRejected(() -> dashboard.getDashboard(end, start));
        expectRejected(() -> dashboard.getDashboard(start, start.plusDays(366)));
        require(dashboard.getDashboard(start, start.plusDays(365)).days().size() == 366, "Valid 366-day range rejected");
    }

    private void categorySafety() {
        var categories = context.getBean(com.example.creatshop.service.CategoryService.class);
        var categoryRepository = context.getBean(com.example.creatshop.repository.CategoryRepository.class);
        var request = com.example.creatshop.domain.dto.request.CategoryRequest.builder()
                .name("  Regression category  ").type("men").description("Original").build();
        Integer id = categories.createCategory(request).getData().getId();
        request.setDescription("Updated only");
        require("Updated only".equals(categories.updateCategory(id, request).getData().getDescription()), "Unchanged category name rejected");
        var duplicate = com.example.creatshop.domain.dto.request.CategoryRequest.builder().name("regression CATEGORY").type("MEN").build();
        boolean rejected = false;
        try { categories.createCategory(duplicate); } catch (com.example.creatshop.exception.AlreadyExistsException expected) { rejected = true; }
        require(rejected, "Normalized duplicate category accepted");
        Fixture fixture = fixture("COD", 2, true);
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            var product = context.getBean(ProductRepository.class).findById(fixture.productId()).orElseThrow();
            product.setCategory(categoryRepository.findById(id).orElseThrow());
        });
        Integer itemCount = jdbc.queryForObject("select count(*) from order_item", Integer.class);
        int beforeStock = stock(fixture);
        expectRejected(() -> categories.deleteCategory(id));
        require(categoryRepository.existsById(id) && context.getBean(ProductRepository.class).existsById(fixture.productId())
                && stock(fixture) == beforeStock && itemCount.equals(jdbc.queryForObject("select count(*) from order_item", Integer.class)),
                "Rejected category deletion lost products, stock or order items");
        require(categories.getAllCategories().getData().stream().flatMap(group -> group.getCategories().stream())
                .anyMatch(category -> category.getId().equals(id) && category.getProductCount() == 1), "Category product count missing");
        Integer emptyId = categories.createCategory(com.example.creatshop.domain.dto.request.CategoryRequest.builder()
                .name("Empty regression category").type("WOMEN").build()).getData().getId();
        categories.deleteCategory(emptyId);
        require(!categoryRepository.existsById(emptyId), "Empty category cannot be deleted");
    }

    private void adminAccountSafety() throws Exception {
        var service = context.getBean(com.example.creatshop.service.UserService.class);
        var users = context.getBean(UserRepository.class);
        Fixture first = fixture("COD", 1, false);
        Fixture second = fixture("COD", 1, false);
        Fixture customer = fixture("COD", 1, true);
        jdbc.update("update users set status = 'BANNED' where role_id in (select id from roles where role_type = 'ROLE_ADMIN')");
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            Role role = context.getBean(RoleRepository.class).findByType(RoleType.ROLE_ADMIN).orElseThrow();
            users.findByUsername(first.username()).orElseThrow().setRole(role);
            users.findByUsername(second.username()).orElseThrow().setRole(role);
        });
        String firstId = users.findByUsername(first.username()).orElseThrow().getId();
        String secondId = users.findByUsername(second.username()).orElseThrow().getId();
        String customerId = users.findByUsername(customer.username()).orElseThrow().getId();
        expectRejected(() -> service.bannedAccount(firstId, first.username()));
        expectRejected(() -> service.bannedAccount(firstId, customer.username()));
        service.bannedAccount(customerId, first.username());
        require(users.findById(customerId).orElseThrow().getStatus() == AccountStatus.BANNED, "Customer lock failed");
        service.unBannedAccount(customerId, first.username());
        require(users.findById(customerId).orElseThrow().getStatus() == AccountStatus.ACTIVE
                && orders.getOrder(customer.username(), orderId(customer)).getData().getOrderItems().size() == 1, "Unlock lost order history");
        List<Boolean> results = race(() -> attempt(() -> service.bannedAccount(secondId, first.username())),
                () -> attempt(() -> service.bannedAccount(firstId, second.username())));
        require(results.stream().filter(Boolean::booleanValue).count() == 1, "Concurrent admin locks both succeeded or both failed");
        require(users.countByRoleTypeAndStatus(RoleType.ROLE_ADMIN, AccountStatus.ACTIVE) == 1, "Last active admin lost");
        String survivor = users.findById(firstId).orElseThrow().getStatus() == AccountStatus.ACTIVE ? first.username() : second.username();
        String survivorId = users.findByUsername(survivor).orElseThrow().getId();
        expectRejected(() -> service.bannedAccount(survivorId, survivor));
        var response = service.getUsers().getData().stream().filter(user -> user.getId().equals(survivorId)).findFirst().orElseThrow();
        require("ROLE_ADMIN".equals(response.getRole()) && response.getCreatedAt() != null, "Admin directory metadata missing");
    }

    private void bannedJwt() throws Exception {
        Fixture fixture = fixture("COD", 1, false);
        UserRepository users = context.getBean(UserRepository.class);
        User user = users.findByUsername(fixture.username()).orElseThrow();
        JwtUtils jwt = context.getBean(JwtUtils.class);
        String token = jwt.generateJwtToken(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        AuthTokenFilter filter = new AuthTokenFilter(jwt, username -> users.findByUsername(username).orElseThrow());
        require(authenticated(filter, token), "Active user's JWT rejected");
        jdbc.update("update users set status = 'BANNED' where username = ?", fixture.username());
        require(!authenticated(filter, token), "Banned user's existing JWT accepted");
        jdbc.update("update users set status = 'ACTIVE' where username = ?", fixture.username());
        require(authenticated(filter, token), "Unbanned user's JWT rejected");
    }

    private boolean authenticated(AuthTokenFilter filter, String token) throws Exception {
        SecurityContextHolder.clearContext();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        AtomicBoolean authenticated = new AtomicBoolean();
        filter.doFilter(request, new MockHttpServletResponse(), (incoming, outgoing) ->
                authenticated.set(SecurityContextHolder.getContext().getAuthentication() != null));
        SecurityContextHolder.clearContext();
        return authenticated.get();
    }

    private void productValidation() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            ProductRequest product = ProductRequest.builder().name("Valid name").price(BigDecimal.valueOf(100)).categoryId(1).build();
            require(validator.validate(product, ProductValidation.Update.class).isEmpty(), "Update requires old images again");
            require(validator.validate(product, ProductValidation.Create.class).size() == 2, "Create must require both images");
            ProductVariantRequest variant = ProductVariantRequest.builder().color("black").size("40")
                    .quantity(0).expectedQuantity(1).build();
            require(validator.validate(variant, ProductValidation.Update.class).isEmpty(), "Zero stock or optional image rejected");
            variant.setQuantity(-1);
            require(!validator.validate(variant, ProductValidation.Update.class).isEmpty(), "Negative stock accepted");
            variant.setQuantity(0);
            variant.setExpectedQuantity(null);
            require(!validator.validate(variant, ProductValidation.Update.class).isEmpty(), "Missing original stock accepted");
        }
        var mvc = MockMvcBuilders.standaloneSetup(new ProductController(context.getBean(ProductService.class)),
                new VariantController(context.getBean(ProductVariantService.class))).build();
        Category category = context.getBean(CategoryRepository.class).save(Category.builder()
                .name("Create category").type(CategoryType.MEN).build());
        require(mvc.perform(MockMvcRequestBuilders.multipart("/api/v1/products")
                .file(new MockMultipartFile("staticImg", "test.png", "image/png", new byte[]{1}))
                .file(new MockMultipartFile("dynamicImg", "test.png", "image/png", new byte[]{1}))
                .file(new MockMultipartFile("variants[0].image", "test.png", "image/png", new byte[]{1}))
                .param("name", "Created product").param("price", "100").param("categoryId", category.getId().toString())
                .param("variants[0].color", "black").param("variants[0].size", "40").param("variants[0].quantity", "0"))
                .andReturn().getResponse().getStatus() == 201, "Create API rejected valid product or zero-stock variant");
        require(mvc.perform(MockMvcRequestBuilders.multipart("/api/v1/products")
                .file(new MockMultipartFile("staticImg", "test.png", "image/png", new byte[]{1}))
                .file(new MockMultipartFile("dynamicImg", "test.png", "image/png", new byte[]{1}))
                .param("name", "Created product").param("price", "100").param("categoryId", category.getId().toString())
                .param("variants[0].color", "black").param("variants[0].size", "40").param("variants[0].quantity", "0"))
                .andReturn().getResponse().getStatus() == 400, "Create API skipped nested variant image validation");
        require(mvc.perform(MockMvcRequestBuilders.multipart("/api/v1/products")
                .param("name", "Valid name").param("price", "100").param("categoryId", "1"))
                .andReturn().getResponse().getStatus() == 400, "Create API did not validate required images");
        Fixture fixture = fixture("COD", 1, false);
        require(mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/v1/variants/" + fixture.variantId())
                .param("color", "black").param("size", "40").param("quantity", "0").param("expectedQuantity", "1"))
                .andReturn().getResponse().getStatus() == 200, "Multipart update without image failed");
        require(stock(fixture) == 0, "Multipart update did not save zero stock");
        require(mvc.perform(MockMvcRequestBuilders.multipart("/api/v1/variants/" + fixture.productId())
                .file(new MockMultipartFile("image", "test.png", "image/png", new byte[]{1}))
                .param("color", "white").param("size", "42").param("quantity", "0"))
                .andReturn().getResponse().getStatus() == 201, "Create variant API failed");
        require(mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/v1/products/" + fixture.productId())
                .param("name", "Updated product").param("price", "200").param("categoryId", category.getId().toString()))
                .andReturn().getResponse().getStatus() == 200, "Product update API requires images again");
        try {
            new CloudinaryUtils(null).getUrlFromFile(new MockMultipartFile("image", "empty.png", "image/png", new byte[0]));
            throw new AssertionError("Empty image accepted");
        } catch (IllegalArgumentException expected) {
            require(true, "Empty image rejected");
        }
    }

    private void productUpdates() {
        Fixture fixture = fixture("COD", 2, false);
        Category category = context.getBean(CategoryRepository.class).save(Category.builder()
                .name("Admin category").type(CategoryType.MEN).build());
        ProductRequest request = ProductRequest.builder().name("Renamed product").price(BigDecimal.valueOf(200)).categoryId(category.getId()).build();
        var response = context.getBean(ProductService.class).updateProduct(fixture.productId(), request).getData();
        require(category.getId().equals(response.getCategoryId()), "Category change not returned or persisted");
        require(jdbc.queryForObject("select category_id from products where id = ?", Integer.class, fixture.productId())
                .equals(category.getId()), "Category change ignored");
        require(stock(fixture) == 2, "Product rename changed stock");
        ProductVariantRequest variant = ProductVariantRequest.builder().color("blue").size("41")
                .quantity(0).expectedQuantity(2).build();
        var updated = context.getBean(ProductVariantService.class).updateVariant(fixture.variantId(), variant).getData();
        require(updated.getQuantity() == 0 && "blue".equals(updated.getColor()), "Variant update failed");
        require("image".equals(response.getImageStaticUrl()), "Update lost original image");
        request.setPrice(new BigDecimal("200.5"));
        require(!attempt(() -> context.getBean(ProductService.class).updateProduct(fixture.productId(), request)), "Fractional VND price accepted");
    }

    private void orderSnapshots() {
        Fixture fixture = fixture("COD", 2, true);
        jdbc.update("update products set name = ?, price = ? where id = ?", "Changed catalog", 999.0, fixture.productId());
        jdbc.update("update product_info set color = ?, size = ? where id = ?", "blue", "XL", fixture.variantId());
        var response = orders.getOrder(fixture.username(), orderId(fixture)).getData();
        var item = response.getOrderItems().get(0);
        require(item.getUnitPrice().compareTo(BigDecimal.valueOf(100)) == 0 && "Check product".equals(item.getProductName()), "Historical price/name changed");
        require("black".equals(item.getVariantColor()) && "M".equals(item.getVariantSize()), "Historical variant changed");
        require(response.getTotal().compareTo(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))) == 0, "Snapshot total mismatch");
        jdbc.update("update order_item set unit_price = NULL, product_name = NULL, variant_color = NULL, variant_size = NULL where order_id = ?",
                orderId(fixture));
        var legacy = orders.getOrder(fixture.username(), orderId(fixture)).getData().getOrderItems().get(0);
        require(legacy.getUnitPrice() == null && legacy.getProductName() == null, "Legacy snapshot was fabricated");
    }

    private void recipientSnapshots() {
        Fixture fixture = fixture("COD", 2, false);
        var created = orders.createOrder(fixture.username(), new OrderRequest(fixture.paymentId(), fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 1)))).getData();
        require(created.isAddressSnapshotAvailable() && "Address".equals(created.getAddress().getAddressDetail()),
                "Checkout response must use the saved recipient");
        var addresses = context.getBean(com.example.creatshop.service.AddressService.class);
        var changed = com.example.creatshop.domain.dto.request.AddressRequest.builder()
                .firstName("New").lastName("Recipient").phoneNumber("0911111111").country("New country")
                .city("New city").district("New district").commune("New commune")
                .addressDetail("New address").description("New instructions").build();
        addresses.updateAddress(fixture.username(), fixture.addressId(), changed);
        require("New address".equals(addresses.getAddressById(fixture.username(), fixture.addressId()).getData().getAddressDetail()),
                "Address edit did not reach the address book");
        var saved = orders.getOrder(fixture.username(), created.getId()).getData();
        var recipient = saved.getAddress();
        require(saved.isAddressSnapshotAvailable() && "Check".equals(recipient.getFirstName())
                && "User".equals(recipient.getLastName()) && "0900000000".equals(recipient.getPhoneNumber())
                && "VN".equals(recipient.getCountry()) && "City".equals(recipient.getCity())
                && "District".equals(recipient.getDistrict()) && "Commune".equals(recipient.getCommune())
                && "Address".equals(recipient.getAddressDetail()) && recipient.getDescription() == null,
                "An address book edit rewrote a purchased order's recipient");
        require(orders.getOrders(fixture.username()).getData().stream().allMatch(order -> order.isAddressSnapshotAvailable()
                        && "Address".equals(order.getAddress().getAddressDetail()))
                && orders.getAllOrders().getData().stream().filter(order -> order.getId().equals(created.getId()))
                        .allMatch(order -> order.isAddressSnapshotAvailable() && "Address".equals(order.getAddress().getAddressDetail())),
                "Customer/admin lists must use the same saved recipient");
        orders.cancelOrder(fixture.username(), fixture.paymentId());
        require(stock(fixture) == 2 && "Address".equals(orders.getOrder(fixture.username(), created.getId()).getData().getAddress().getAddressDetail()),
                "Cancellation changed the recipient or stock release");
        jdbc.update("update order_details set recipient_first_name = NULL, recipient_last_name = NULL, recipient_phone_number = NULL, "
                + "recipient_country = NULL, recipient_city = NULL, recipient_district = NULL, recipient_commune = NULL, "
                + "recipient_address_detail = NULL, recipient_description = NULL where id = ?", created.getId());
        var legacy = orders.getOrder(fixture.username(), created.getId()).getData();
        require(!legacy.isAddressSnapshotAvailable() && "New address".equals(legacy.getAddress().getAddressDetail()),
                "Legacy current address must not be labelled as a purchase snapshot");
    }

    private void duplicateVariants() throws Exception {
        Fixture fixture = fixture("COD", 3, false);
        ProductVariantService service = context.getBean(ProductVariantService.class);
        ProductVariantRequest duplicate = ProductVariantRequest.builder().color(" Black ").size(" m ").quantity(8)
                .image(new MockMultipartFile("image", "image.png", "image/png", new byte[]{1})).build();
        require(!attempt(() -> service.createVariant(fixture.productId(), duplicate)), "Normalized duplicate accepted");
        ProductVariantRequest fresh = ProductVariantRequest.builder().color("blue").size("L").quantity(4)
                .image(new MockMultipartFile("image", "image.png", "image/png", new byte[]{1})).build();
        var second = service.createVariant(fixture.productId(), fresh).getData();
        duplicate.setExpectedQuantity(4);
        require(!attempt(() -> service.updateVariant(second.getId(), duplicate)), "Update created duplicate");
        require(jdbc.queryForObject("select quantity from product_info where id = ?", Integer.class, second.getId()) == 4,
                "Rejected duplicate update changed stock");
        ProductVariantRequest racing = ProductVariantRequest.builder().color("green").size("S").quantity(1)
                .image(new MockMultipartFile("image", "image.png", "image/png", new byte[]{1})).build();
        List<Boolean> result = race(() -> attempt(() -> service.createVariant(fixture.productId(), racing)),
                () -> attempt(() -> service.createVariant(fixture.productId(), racing)));
        require(result.stream().filter(Boolean::booleanValue).count() == 1, "Concurrent duplicate creation was not rejected");
        Integer greenId = jdbc.queryForObject("select id from product_info where product_id = ? and color = 'green' and size = 'S'",
                Integer.class, fixture.productId());
        ProductVariantRequest updateFirst = ProductVariantRequest.builder().color("white").size("XL").quantity(4).expectedQuantity(4).build();
        ProductVariantRequest updateSecond = ProductVariantRequest.builder().color(" WHITE ").size(" xl ").quantity(1).expectedQuantity(1).build();
        List<Boolean> updates = race(() -> attempt(() -> service.updateVariant(second.getId(), updateFirst)),
                () -> attempt(() -> service.updateVariant(greenId, updateSecond)));
        require(updates.stream().filter(Boolean::booleanValue).count() == 1, "Concurrent updates created duplicate variants");
        require(stock(fixture) == 3, "Duplicate creation changed existing stock");
        Category category = context.getBean(CategoryRepository.class).save(Category.builder()
                .name("Duplicate check").type(CategoryType.MEN).build());
        ProductRequest nested = ProductRequest.builder().name("Duplicate nested").price(BigDecimal.valueOf(100)).categoryId(category.getId())
                .staticImg(racing.getImage()).dynamicImg(racing.getImage()).variants(List.of(racing, racing)).build();
        require(!attempt(() -> context.getBean(ProductService.class).createProduct(nested)), "Nested duplicates accepted");
        require(jdbc.queryForObject("select count(*) from products where name = 'Duplicate nested'", Integer.class) == 0,
                "Rejected nested duplicates left a partial product");
    }

    private void adminStockRace() throws Exception {
        Fixture stale = fixture("COD", 2, false);
        createOrder(stale, stale.paymentId());
        ProductVariantRequest staleRequest = ProductVariantRequest.builder().color("black").size("40")
                .quantity(10).expectedQuantity(2).build();
        require(!attempt(() -> context.getBean(ProductVariantService.class).updateVariant(stale.variantId(), staleRequest)),
                "Stale form overwrote purchased stock");
        require(stock(stale) == 1, "Rejected update changed stock");
        Fixture concurrent = fixture("COD", 1, false);
        ProductVariantRequest request = ProductVariantRequest.builder().color("black").size("40")
                .quantity(5).expectedQuantity(1).build();
        List<Boolean> results = race(
                () -> attempt(() -> context.getBean(ProductVariantService.class).updateVariant(concurrent.variantId(), request)),
                () -> attempt(() -> createOrder(concurrent, concurrent.paymentId())));
        require(results.get(1), "Checkout unexpectedly failed");
        require(stock(concurrent) == (results.get(0) ? 4 : 0), "Admin edit overwrote checkout stock");
    }

    private void productDeletion() {
        ProductVariantService variants = context.getBean(ProductVariantService.class);
        Fixture ordered = fixture("COD", 1, true);
        require(!attempt(() -> variants.deleteVariant(ordered.variantId())), "Variant used by order deleted");
        require(!attempt(() -> context.getBean(ProductService.class).deleteProduct(ordered.productId())), "Product used by order deleted");
        Fixture cart = fixture("COD", 1, false);
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            context.getBean(CartItemRepository.class).save(CartItem.builder().quantity(1)
                    .product(context.getBean(ProductRepository.class).findById(cart.productId()).orElseThrow())
                    .productVariant(context.getBean(ProductVariantRepository.class).findById(cart.variantId()).orElseThrow()).build());
        });
        require(!attempt(() -> variants.deleteVariant(cart.variantId())), "Variant used by cart deleted");
        Fixture unused = fixture("COD", 0, false);
        variants.deleteVariant(unused.variantId());
        require(context.getBean(ProductRepository.class).existsById(unused.productId()), "Deleting last variant deleted parent product");
        require(!context.getBean(ProductVariantRepository.class).existsById(unused.variantId()), "Unused variant not deleted");
    }

    private Fixture fixture(String provider, int quantity, boolean ordered) {
        Fixture fixture = new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).execute(transaction -> {
            RoleRepository roles = context.getBean(RoleRepository.class);
            Role role = roles.findByType(RoleType.ROLE_USER).orElseGet(() -> roles.save(Role.builder().type(RoleType.ROLE_USER).build()));
            String username = "check-" + UUID.randomUUID();
            User user = context.getBean(UserRepository.class).save(User.builder().username(username).password("unused")
                    .firstName("Check").lastName("User").email(username + "@example.test").phoneNumber("0900000000")
                    .role(role).status(AccountStatus.ACTIVE).build());
            Address address = context.getBean(AddressRepository.class).save(Address.builder().user(user)
                    .firstName("Check").lastName("User").phoneNumber("0900000000").country("VN").city("City")
                    .district("District").commune("Commune").addressDetail("Address").build());
            Product product = context.getBean(ProductRepository.class).save(Product.builder().name("Check product")
                    .price(BigDecimal.valueOf(100)).imageStaticUrl("image").imageDynamicUrl("image").build());
            ProductVariant variant = context.getBean(ProductVariantRepository.class).save(ProductVariant.builder()
                    .product(product).quantity(quantity).color("black").size("M").build());
            Integer paymentId = payments.createPayment(username, payment(provider, "PENDING")).getData().getId();
            return new Fixture(username, product.getId(), variant.getId(), address.getId(), paymentId);
        });
        if (ordered) createOrder(fixture, fixture.paymentId());
        return fixture;
    }

    private void createOrder(Fixture fixture, Integer paymentId) {
        orders.createOrder(fixture.username(), new OrderRequest(paymentId, fixture.addressId(),
                List.of(new OrderItemRequest(fixture.productId(), fixture.variantId(), 1))));
    }

    private static PaymentRequest payment(String provider, String status) {
        return new PaymentRequest(BigDecimal.valueOf(100), provider, status);
    }

    private int stock(Fixture fixture) {
        return jdbc.queryForObject("select quantity from product_info where id = ?", Integer.class, fixture.variantId());
    }

    private Integer orderId(Fixture fixture) {
        return jdbc.queryForObject("select order_id from payment_details where id = ?", Integer.class, fixture.paymentId());
    }

    private PaymentStatus status(Fixture fixture) {
        return PaymentStatus.valueOf(jdbc.queryForObject("select status from payment_details where id = ?", String.class, fixture.paymentId()));
    }

    private void age(Fixture fixture, int minutes) {
        jdbc.update("update payment_details set created_at = ? where id = ?",
                Timestamp.from(Instant.now().minusSeconds(minutes * 60L)), fixture.paymentId());
    }

    private void requireConsistentSuccessfulPayment(Fixture fixture) {
        PaymentStatus status = status(fixture);
        require(status == PaymentStatus.COMPLETED || status == PaymentStatus.REFUND_REQUIRED, "Successful payment lost");
        require(stock(fixture) == (status == PaymentStatus.COMPLETED ? 0 : 1), "Payment and stock disagree");
    }

    private MockHttpServletRequest callback(Fixture fixture, boolean success) {
        return signed(fields(fixture, success));
    }

    private Map<String, String> fields(Fixture fixture, boolean success) {
        return new TreeMap<>(Map.of("vnp_TmnCode", "REGRESSION", "vnp_TxnRef", fixture.paymentId().toString(),
                "vnp_Amount", "10000", "vnp_ResponseCode", success ? "00" : "24", "vnp_TransactionStatus", success ? "00" : "02"));
    }

    private MockHttpServletRequest signed(Map<String, String> fields) {
        String data = new TreeMap<>(fields).entrySet().stream()
                .map(entry -> entry.getKey() + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        MockHttpServletRequest request = new MockHttpServletRequest();
        fields.forEach(request::setParameter);
        request.setParameter("vnp_SecureHash", VNPayUtil.hmacSHA512(SECRET, data));
        return request;
    }

    private Map<String, String> query(String url) {
        return Arrays.stream(URI.create(url).getRawQuery().split("&")).map(value -> value.split("=", 2))
                .collect(Collectors.toMap(parts -> parts[0], parts -> URLDecoder.decode(parts[1], StandardCharsets.UTF_8)));
    }

    private List<Boolean> race(Callable<Boolean> first, Callable<Boolean> second) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var futures = List.of(first, second).stream().map(action -> executor.submit(() -> {
            ready.countDown();
            require(start.await(10, TimeUnit.SECONDS), "Race did not start");
            return action.call();
        })).toList();
        require(ready.await(10, TimeUnit.SECONDS), "Race workers not ready");
        start.countDown();
        return List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
    }

    private static boolean attempt(Runnable action) {
        try {
            action.run();
            return true;
        } catch (BadRequestException expected) {
            return false;
        }
    }

    private static void expectRejected(Runnable action) {
        require(!attempt(action), "Invalid operation was accepted");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private void run(String name, CheckedAction action) throws Exception {
        action.run();
        passed++;
        System.out.println("PASS: " + name);
    }

    private record Fixture(String username, Integer productId, Integer variantId, Integer addressId, Integer paymentId) {}

    @FunctionalInterface
    private interface CheckedAction {
        void run() throws Exception;
    }

    @Configuration
    @EnableAutoConfiguration
    @EntityScan(basePackageClasses = {User.class, com.example.creatshop.social.SocialIdentity.class})
    @EnableJpaRepositories(basePackageClasses = {PaymentDetailRepository.class, com.example.creatshop.social.SocialIdentityRepository.class})
    @ComponentScan(basePackageClasses = PaymentMapper.class)
    @Import({OrderDetailServiceImpl.class, PaymentServiceImpl.class, PaymentLifecycleService.class,
            VNPayService.class, VNPayConfig.class, EnumUtils.class, JwtUtils.class, PaymentExpirationJob.class,
            ProductServiceImpl.class, ProductVariantServiceImpl.class, com.example.creatshop.service.impl.CartItemServiceImpl.class,
            com.example.creatshop.service.impl.CategoryServiceImpl.class, com.example.creatshop.service.impl.UserServiceImpl.class,
            com.example.creatshop.service.DashboardService.class, com.example.creatshop.service.impl.AddressServiceImpl.class})
    static class CheckConfig {
        @Bean
        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
            return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        }

        @Bean
        CloudinaryUtils cloudinaryUtils() {
            return new CloudinaryUtils(null) {
                @Override
                public String getUrlFromFile(org.springframework.web.multipart.MultipartFile file) {
                    return "test-image";
                }
            };
        }
    }
}

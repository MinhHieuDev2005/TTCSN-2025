package com.example.creatshop.domain.entity;


import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.Objects;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "addresses")
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @Column(nullable = false)
    String firstName;

    @Column(nullable = false)
    String lastName;

    @Column(nullable = false)
    String country;

    @Column(nullable = false)
    String city;

    @Column(nullable = false)
    String district;

    @Column(nullable = false)
    String commune;

    @Column(nullable = false)
    String addressDetail;

    String description;

    @Column(nullable = false)
    String phoneNumber;

    @ManyToOne
    User user;

    public void addUser(User user) {
        if (Objects.isNull(user.getAddresses())) {
            user.setAddresses(new ArrayList<>());
            user.getAddresses().add(this);
        }
        this.setUser(user);
    }
}

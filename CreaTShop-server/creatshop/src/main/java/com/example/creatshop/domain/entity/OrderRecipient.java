package com.example.creatshop.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class OrderRecipient {
    @Column(name = "recipient_first_name", updatable = false)
    private String firstName;
    @Column(name = "recipient_last_name", updatable = false)
    private String lastName;
    @Column(name = "recipient_phone_number", updatable = false)
    private String phoneNumber;
    @Column(name = "recipient_country", updatable = false)
    private String country;
    @Column(name = "recipient_city", updatable = false)
    private String city;
    @Column(name = "recipient_district", updatable = false)
    private String district;
    @Column(name = "recipient_commune", updatable = false)
    private String commune;
    @Column(name = "recipient_address_detail", updatable = false)
    private String addressDetail;
    @Column(name = "recipient_description", updatable = false)
    private String description;
}

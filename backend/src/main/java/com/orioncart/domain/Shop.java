package com.orioncart.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "shop")
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Stored as PostGIS geometry(Point,4326)
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point location;

    public Shop() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Point getLocation() { return location; }
    public void setLocation(Point location) { this.location = location; }
}


package com.SenaiCommunity.BackEnd.Entity;

import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
public class Supervisor extends Usuario {
    // Pode adicionar campos específicos no futuro se precisar
}
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

// Hash fictício (custo 12): comparado quando o e-mail não existe, para o
// tempo de resposta não revelar se a conta existe.
const HASH_FICTICIO =
  '$2b$12$ghDE7UBmoOMWD5H.iQcS9eyHNB8w/m.Mf6nEJlB3pjX2661wZ.ytK';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, senha }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const senhaValida = await bcrypt.compare(
      senha,
      user?.senhaHash ?? HASH_FICTICIO,
    );

    // Conta só com Google (sem senha) cai no mesmo erro genérico.
    if (!user?.senhaHash || !senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, role: true },
    });

    // Token ainda válido, mas a conta foi removida.
    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    return user;
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nome: dto.email.split('@')[0],
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        criadoEm: true,
      },
    });

    return user;
  }
}

import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { GOOGLE_VERIFIER, type GoogleVerifier } from './google-verifier.js';

// Hash fictício (custo 12): comparado quando o e-mail não existe, para o
// tempo de resposta não revelar se a conta existe.
const HASH_FICTICIO =
  '$2b$12$ghDE7UBmoOMWD5H.iQcS9eyHNB8w/m.Mf6nEJlB3pjX2661wZ.ytK';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(GOOGLE_VERIFIER) private readonly verifyGoogle: GoogleVerifier,
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

    return this.authResponse(user);
  }

  async loginWithGoogle(idToken: string) {
    const { googleId, email, nome } = await this.verifyGoogle(idToken);

    // Busca pelo googleId primeiro: o e-mail da conta Google pode mudar.
    const user =
      (await this.prisma.user.findUnique({ where: { googleId } })) ??
      (await this.prisma.user.upsert({
        where: { email },
        // O cadastro local não confirma e-mail: a senha pode ter sido criada
        // por outra pessoa. O Google provou o dono, então ela é descartada.
        update: { googleId, senhaHash: null },
        create: { email, nome, googleId },
      }));

    return this.authResponse(user);
  }

  // Mesma resposta para login local e Google.
  private async authResponse(user: User) {
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

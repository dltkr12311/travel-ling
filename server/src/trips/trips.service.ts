import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from './trip.entity';
import { CreateTripDto, SaveTripDto } from './trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripsRepository: Repository<Trip>,
  ) {}

  async createTrip(dto: CreateTripDto): Promise<Trip> {
    const id = dto.id ?? Math.random().toString(36).substring(2, 10);
    const trip = this.tripsRepository.create({ id, data: dto.data ?? {} });
    return this.tripsRepository.save(trip);
  }

  async getTrip(id: string): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({ where: { id } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    return trip;
  }

  async saveTrip(dto: SaveTripDto): Promise<Trip> {
    const existing = await this.tripsRepository.findOne({ where: { id: dto.id } });
    if (existing) {
      existing.data = dto.data ?? {};
      return this.tripsRepository.save(existing);
    }

    const newTrip = this.tripsRepository.create({ id: dto.id, data: dto.data ?? {} });
    return this.tripsRepository.save(newTrip);
  }
}

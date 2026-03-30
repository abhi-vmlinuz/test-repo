import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Challenge {
    id: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    points: number;
    category: string;
    is_published?: boolean;
}

interface PoolSelectorProps {
    poolName: string; // 'A', 'B', or 'C'
    selectedChallenges: string[];
    availableChallenges: Challenge[];
    onChange: (challengeIds: string[]) => void;
}

const POINTS_MAP = {
    EASY: 10,
    MEDIUM: 20,
    HARD: 30
};

const DIFFICULTY_COLORS = {
    EASY: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HARD: 'bg-red-100 text-red-800'
};

export const PoolSelector = ({ poolName, selectedChallenges, availableChallenges, onChange }: PoolSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

    // Calculate current pool stats
    const selectedChallengeObjects = availableChallenges.filter(c => selectedChallenges.includes(c.id));
    const totalPoints = selectedChallengeObjects.reduce((sum, c) => sum + POINTS_MAP[c.difficulty], 0);
    const challengeCount = selectedChallenges.length;

    // Validation
    const isValid = challengeCount > 0 && totalPoints === 120;
    const pointsRemaining = 120 - totalPoints;

    // Filter available challenges
    const filteredChallenges = availableChallenges.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = filterDifficulty === 'all' || c.difficulty === filterDifficulty;
        return matchesSearch && matchesDifficulty;
    });

    const handleToggleChallenge = (challengeId: string) => {
        if (selectedChallenges.includes(challengeId)) {
            onChange(selectedChallenges.filter(id => id !== challengeId));
        } else {
            onChange([...selectedChallenges, challengeId]);
        }
    };

    const handleRemoveChallenge = (challengeId: string) => {
        onChange(selectedChallenges.filter(id => id !== challengeId));
    };

    return (
        <div className="border rounded-lg p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Pool {poolName}</h3>
                    {isValid ? (
                        <Badge className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valid
                        </Badge>
                    ) : (
                        <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Invalid
                        </Badge>
                    )}
                </div>
                <div className="text-sm text-gray-600">
                    <span className={challengeCount > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                        {challengeCount} challenges
                    </span>
                    <span className="mx-2">•</span>
                    <span className={totalPoints === 120 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {totalPoints}/120 points
                    </span>
                    {pointsRemaining !== 0 && (
                        <>
                            <span className="mx-2">•</span>
                            <span className="text-gray-500">
                                {pointsRemaining > 0 ? `Need ${pointsRemaining} more` : `${Math.abs(pointsRemaining)} over`}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Selected Challenges */}
            {selectedChallengeObjects.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected Challenges:</p>
                    <div className="space-y-2">
                        {selectedChallengeObjects.map(challenge => (
                            <div key={challenge.id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                <div className="flex items-center gap-2 flex-1">
                                    <Badge className={DIFFICULTY_COLORS[challenge.difficulty]}>
                                        {challenge.difficulty}
                                    </Badge>
                                    {challenge.is_published === false && (
                                        <Badge className="bg-gray-200 text-gray-700">Unpublished</Badge>
                                    )}
                                    <span className="text-sm font-medium">{challenge.title}</span>
                                    <span className="text-xs text-gray-500">{challenge.category}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-700">
                                        {POINTS_MAP[challenge.difficulty]} pts
                                    </span>
                                    <button
                                        onClick={() => handleRemoveChallenge(challenge.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search challenges..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">All Difficulties</option>
                    <option value="EASY">Easy (10 pts)</option>
                    <option value="MEDIUM">Medium (20 pts)</option>
                    <option value="HARD">Hard (30 pts)</option>
                </select>
            </div>

            {/* Available Challenges */}
            <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredChallenges.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No challenges found</p>
                ) : (
                    filteredChallenges.map(challenge => {
                        const isSelected = selectedChallenges.includes(challenge.id);
                        return (
                            <div
                                key={challenge.id}
                                onClick={() => handleToggleChallenge(challenge.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="w-4 h-4"
                                    />
                                    <Badge className={DIFFICULTY_COLORS[challenge.difficulty]}>
                                        {challenge.difficulty}
                                    </Badge>
                                    {challenge.is_published === false && (
                                        <Badge className="bg-gray-200 text-gray-700">Unpublished</Badge>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{challenge.title}</p>
                                        <p className="text-xs text-gray-500">{challenge.category}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 ml-3">
                                    {POINTS_MAP[challenge.difficulty]} pts
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Validation Messages */}
            {!isValid && selectedChallenges.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-semibold mb-1">Pool Requirements:</p>
                            <ul className="list-disc list-inside space-y-1">
                                {challengeCount === 0 && (
                                    <li>Must have at least one challenge</li>
                                )}
                                {totalPoints !== 120 && (
                                    <li>Total points must equal 120 (currently {totalPoints})</li>
                                )}
                            </ul>
                            <p className="mt-2 text-xs text-gray-600">
                                Examples: 12 Easy | 6 Medium | 4 Hard | 2 Easy + 5 Medium | 3 Easy + 3 Medium + 1 Hard | etc.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
